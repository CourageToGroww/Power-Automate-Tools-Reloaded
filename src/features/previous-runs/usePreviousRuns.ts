import { MessageBarType } from "@fluentui/react/lib/MessageBar";
import { useEffect, useState } from "react";
import { useMessageBar } from "../../common/components/Messages";
import { useApiProviderContext } from "../../common/providers/ApiProvider";
import { FlowFailure, FlowRun, FlowRunDetails, FlowRunAction } from "./types";

const DEBUG = true;

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[PA-Tools FlowFailures]', ...args);
  }
}

function debugError(...args: any[]) {
  if (DEBUG) {
    console.error('[PA-Tools FlowFailures Error]', ...args);
  }
}

export const usePreviousRuns = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [failures, setFailures] = useState<FlowFailure[]>([]);
  const [selectedFailure, setSelectedFailure] = useState<FlowFailure | null>(null);
  const [selectedRunDetails, setSelectedRunDetails] = useState<FlowRunDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [showAllRuns, setShowAllRuns] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  const api = useApiProviderContext();
  const query = new URLSearchParams(location.search);

  const envId = query.get("envId");
  const flowId = query.get("flowId");

  debugLog('Flow failures initialized with envId:', envId, 'flowId:', flowId);

  const messageBar = useMessageBar();

  const addMessage = (msg: string | string[], type?: MessageBarType) => {
    debugLog('Adding message:', msg, 'type:', type);
    messageBar.setMessages([
      {
        key: Date.now().toString(),
        messageBarType: type || MessageBarType.success,
        isMultiline: typeof msg !== "string",
        children: msg,
      },
    ]);
  };

  // Fetch flow run history and filter for failures
  const fetchFlowFailures = async () => {
    if (!envId || !flowId || !api.isApiReady) {
      return;
    }

    try {
      debugLog('Fetching flow run history...');
      setIsLoading(true);

      const runsUrl = getFlowRunsUrl(envId, flowId);
      debugLog('Flow runs URL:', runsUrl);

      const runsResponse = await api.get(runsUrl);
      debugLog('Flow runs response received:', {
        totalRuns: runsResponse.value?.length || 0,
      });

      if (!runsResponse.value || !Array.isArray(runsResponse.value)) {
        throw new Error('Invalid runs response - missing or invalid value array');
      }

      const runs: FlowRun[] = runsResponse.value;
      
      // Log all runs for debugging
      debugLog('All runs:', runs.map(run => ({
        id: run.name,
        status: run.properties.status,
        triggerStatus: run.properties.trigger?.status,
        startTime: run.properties.startTime
      })));

      // Filter runs based on showAllRuns toggle
      const filteredRuns = showAllRuns 
        ? runs 
        : runs.filter(run => 
            run.properties.status === 'Failed' || 
            run.properties.trigger?.status === 'Failed'
          );
      debugLog('Filtered runs found:', filteredRuns.length, 'showAllRuns:', showAllRuns);

      // Convert to FlowFailure objects with basic info
      const flowFailures: FlowFailure[] = filteredRuns.map(run => ({
        runId: run.name,
        runName: run.name,
        startTime: run.properties.startTime,
        endTime: run.properties.endTime,
        status: run.properties.status,
        failedActions: [], // Will be populated when details are fetched
        triggerFailed: run.properties.trigger?.status === 'Failed',
        clientTrackingId: run.properties.correlation.clientTrackingId,
      }));

      setFailures(flowFailures);

      if (flowFailures.length === 0) {
        addMessage(showAllRuns ? 'No flow runs found.' : 'No failed flow runs found.', MessageBarType.info);
      } else {
        addMessage(showAllRuns 
          ? `Found ${flowFailures.length} flow runs.` 
          : `Found ${flowFailures.length} failed flow runs.`);
      }

    } catch (error) {
      debugError('Error fetching flow failures:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addMessage(
        `Error loading flow failures: ${errorMessage}`,
        MessageBarType.error
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detailed information for a specific failed run
  const fetchRunDetails = async (runId: string) => {
    if (!envId || !flowId || !api.isApiReady) {
      return;
    }

    try {
      debugLog('Fetching run details for:', runId);
      setIsLoadingDetails(true);

      const runDetailsUrl = getFlowRunDetailsUrl(envId, flowId, runId);
      debugLog('Run details URL:', runDetailsUrl);

      const runDetails: FlowRunDetails = await api.get(runDetailsUrl);
      debugLog('Run details received:', {
        runId: runDetails.name,
        status: runDetails.properties.status,
        hasActions: !!runDetails.properties.actions,
        actionCount: runDetails.properties.actions ? Object.keys(runDetails.properties.actions).length : 0,
        fullRunDetails: runDetails, // Log the full response for debugging
      });

      // If no actions but run failed, try to get action details from a different endpoint
      if ((!runDetails.properties.actions || Object.keys(runDetails.properties.actions).length === 0) && 
          runDetails.properties.status === 'Failed') {
        debugLog('No actions found but run failed - trying alternative endpoints...');
        
        try {
          // Try to get run actions from the actions endpoint
          const actionsUrl = `${getFlowRunDetailsUrl(envId, flowId, runId)}/actions`;
          debugLog('Trying actions URL:', actionsUrl);
          const actionsResponse = await api.get(actionsUrl);
          debugLog('Actions response:', actionsResponse);
          
          if (actionsResponse.value && Array.isArray(actionsResponse.value)) {
            // Convert actions array to object format
            const actionsObject: { [key: string]: FlowRunAction } = {};
            actionsResponse.value.forEach((action: any) => {
              if (action.name) {
                actionsObject[action.name] = action;
              }
            });
            runDetails.properties.actions = actionsObject;
            debugLog('Successfully populated actions from actions endpoint:', Object.keys(actionsObject));
          }
        } catch (actionsError) {
          debugLog('Failed to fetch from actions endpoint:', actionsError);
          
          // Try another approach - get the run history with more details
          try {
            const detailedRunUrl = `${getFlowRunDetailsUrl(envId, flowId, runId)}?$expand=properties/trigger,properties/actions`;
            debugLog('Trying detailed run URL:', detailedRunUrl);
            const detailedRun = await api.get(detailedRunUrl);
            debugLog('Detailed run response:', detailedRun);
            
            if (detailedRun.properties?.actions) {
              runDetails.properties.actions = detailedRun.properties.actions;
              debugLog('Successfully populated actions from detailed run endpoint');
            }
          } catch (detailedError) {
            debugLog('Failed to fetch detailed run:', detailedError);
          }
        }
      }

      // Find failed actions
      const failedActions: FlowRunAction[] = [];
      
      // Check if trigger failed
      if (runDetails.properties.trigger?.status === 'Failed') {
        failedActions.push(runDetails.properties.trigger);
      }

      // Check actions for failures
      if (runDetails.properties.actions) {
        Object.values(runDetails.properties.actions).forEach(action => {
          if (action.status === 'Failed') {
            failedActions.push(action);
          }
        });
      }

      debugLog('Failed actions found:', failedActions.length);

      // Update the failure with detailed action information
      setFailures(prev => prev.map(failure => 
        failure.runId === runId 
          ? { ...failure, failedActions }
          : failure
      ));

      setSelectedRunDetails(runDetails);

    } catch (error) {
      debugError('Error fetching run details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addMessage(
        `Error loading run details: ${errorMessage}`,
        MessageBarType.error
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Load failures on component mount and when showAllRuns changes
  useEffect(() => {
    if (envId && flowId && api.isApiReady) {
      fetchFlowFailures();
    }
  }, [envId, flowId, api.isApiReady, showAllRuns]);

  const selectFailure = (failure: FlowFailure) => {
    setSelectedFailure(failure);
    fetchRunDetails(failure.runId);
  };

  const refreshFailures = () => {
    setSelectedFailure(null);
    setSelectedRunDetails(null);
    fetchFlowFailures();
  };

  const toggleShowAllRuns = () => {
    debugLog('Toggling showAllRuns from', showAllRuns, 'to', !showAllRuns);
    setShowAllRuns(!showAllRuns);
    setSelectedFailure(null);
    setSelectedRunDetails(null);
    // The useEffect will handle refetching when showAllRuns changes
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  return {
    isLoading,
    isLoadingDetails,
    failures,
    selectedFailure,
    selectedRunDetails,
    showAllRuns,
    debugMode,
    selectFailure,
    refreshFailures,
    toggleShowAllRuns,
    toggleDebugMode,
    addMessage,
    ...messageBar,
  };
};

function getFlowRunsUrl(envId: string, flowId: string) {
  return `providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/runs`;
}

function getFlowRunDetailsUrl(envId: string, flowId: string, runId: string) {
  return `providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/runs/${runId}`;
} 