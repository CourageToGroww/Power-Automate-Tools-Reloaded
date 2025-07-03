import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { FlowRunAction, FlowRunDetails } from '../types';
import { ZoomIn, ZoomOut, Maximize2, CheckCircle, XCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface FlowNode {
  id: string;
  action: FlowRunAction;
  x: number;
  y: number;
  width: number;
  height: number;
  children: FlowNode[];
  parent?: FlowNode;
  column: number;
  row: number;
}

interface FlowVisualizationProps {
  runDetails: FlowRunDetails;
  selectedAction: string | null;
  onActionClick: (actionId: string, action: FlowRunAction) => void;
}

export const FlowVisualization: React.FC<FlowVisualizationProps> = ({
  runDetails,
  selectedAction,
  onActionClick,
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 100;
  const HORIZONTAL_SPACING = 100;
  const VERTICAL_SPACING = 80;

  // Build flow tree from runDetails
  const buildFlowTree = (): FlowNode => {
    const actions = runDetails.properties.actions || {};
    const trigger = runDetails.properties.trigger;
    const flowDefinition = runDetails.properties.definition;
    
    // Create trigger node
    const triggerNode: FlowNode = {
      id: 'trigger',
      action: trigger,
      x: 0,
      y: 0,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      children: [],
      column: 0,
      row: 0,
    };

    // Map to store nodes by ID
    const nodeMap: { [key: string]: FlowNode } = {
      trigger: triggerNode,
    };

    // Create all action nodes
    Object.entries(actions).forEach(([id, action]) => {
      nodeMap[id] = {
        id,
        action,
        x: 0,
        y: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        children: [],
        column: 0,
        row: 0,
      };
    });

    // Build parent-child relationships from flow definition
    if (flowDefinition && flowDefinition.actions) {
      Object.entries(flowDefinition.actions).forEach(([actionId, actionDef]: [string, any]) => {
        const node = nodeMap[actionId];
        if (!node) return;

        if (actionDef.runAfter && Object.keys(actionDef.runAfter).length > 0) {
          // Find parent nodes
          Object.keys(actionDef.runAfter).forEach(parentId => {
            const parentNode = nodeMap[parentId] || triggerNode;
            if (parentNode && !parentNode.children.includes(node)) {
              parentNode.children.push(node);
              node.parent = parentNode;
            }
          });
        } else {
          // No runAfter means it runs after trigger
          if (!triggerNode.children.includes(node)) {
            triggerNode.children.push(node);
            node.parent = triggerNode;
          }
        }
      });
    }

    // Calculate positions using a layout algorithm
    calculateNodePositions(triggerNode);

    return triggerNode;
  };

  // Calculate node positions for tree layout
  const calculateNodePositions = (root: FlowNode) => {
    const visited = new Set<string>();
    const columns: FlowNode[][] = [];

    // BFS to assign columns
    const queue: FlowNode[] = [root];
    root.column = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      if (!columns[node.column]) {
        columns[node.column] = [];
      }
      columns[node.column].push(node);

      node.children.forEach(child => {
        if (!visited.has(child.id)) {
          child.column = node.column + 1;
          queue.push(child);
        }
      });
    }

    // Position nodes
    columns.forEach((column, colIndex) => {
      const totalHeight = column.length * (CARD_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING;
      const startY = -totalHeight / 2;

      column.forEach((node, rowIndex) => {
        node.x = colIndex * (CARD_WIDTH + HORIZONTAL_SPACING);
        node.y = startY + rowIndex * (CARD_HEIGHT + VERTICAL_SPACING);
        node.row = rowIndex;
      });
    });
  };

  const rootNode = buildFlowTree();

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const nodes = getAllNodes(rootNode);
    
    if (nodes.length === 0) return;

    const bounds = {
      minX: Math.min(...nodes.map(n => n.x)),
      maxX: Math.max(...nodes.map(n => n.x + n.width)),
      minY: Math.min(...nodes.map(n => n.y)),
      maxY: Math.max(...nodes.map(n => n.y + n.height)),
    };

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    const scaleX = (container.width - 100) / width;
    const scaleY = (container.height - 100) / height;
    const scale = Math.min(scaleX, scaleY, 1);

    setZoom(scale);
    setOffset({
      x: (container.width - width * scale) / 2 - bounds.minX * scale,
      y: (container.height - height * scale) / 2 - bounds.minY * scale,
    });
  };

  const getAllNodes = (node: FlowNode): FlowNode[] => {
    const nodes = [node];
    node.children.forEach(child => {
      nodes.push(...getAllNodes(child));
    });
    return nodes;
  };

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Render connections between nodes
  const renderConnections = (node: FlowNode) => {
    const connections: JSX.Element[] = [];

    node.children.forEach((child, index) => {
      const startX = node.x + node.width;
      const startY = node.y + node.height / 2;
      const endX = child.x;
      const endY = child.y + child.height / 2;

      const midX = (startX + endX) / 2;

      connections.push(
        <path
          key={`${node.id}-${child.id}`}
          d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
          stroke={child.action.status === 'Failed' ? '#ef4444' : '#94a3b8'}
          strokeWidth="2"
          fill="none"
          className="transition-all"
        />
      );

      connections.push(...renderConnections(child));
    });

    return connections;
  };

  // Render action card
  const renderActionCard = (node: FlowNode) => {
    const { action, id } = node;
    const isTrigger = id === 'trigger';

    const getStatusIcon = () => {
      switch (action.status) {
        case 'Succeeded':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'Failed':
          return <XCircle className="w-4 h-4 text-red-500" />;
        case 'Skipped':
          return <AlertCircle className="w-4 h-4 text-gray-400" />;
        case 'Running':
          return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
        default:
          return <Activity className="w-4 h-4 text-gray-400" />;
      }
    };

    const getCardColor = () => {
      if (isTrigger && action.status === 'Succeeded') {
        return 'border-green-500 bg-green-50 dark:bg-green-950/50';
      }
      switch (action.status) {
        case 'Failed':
          return 'border-red-500 bg-red-50 dark:bg-red-950/50';
        case 'Running':
          return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50';
        default:
          return 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900';
      }
    };

    return (
      <g key={id}>
        <foreignObject
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          className="overflow-visible"
        >
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              getCardColor(),
              selectedAction === id && 'ring-2 ring-primary ring-offset-2',
              'h-full'
            )}
            onClick={() => onActionClick(id, action)}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium truncate flex-1">{action.name}</h4>
                  {isTrigger && (
                    <Badge variant="outline" className="text-xs ml-2">Trigger</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{action.type}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                {getStatusIcon()}
                {action.startTime && action.endTime && (
                  <span className="text-xs text-muted-foreground">
                    {((new Date(action.endTime).getTime() - new Date(action.startTime).getTime()) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </foreignObject>
        {node.children.map(child => renderActionCard(child))}
      </g>
    );
  };

  useEffect(() => {
    handleFitToScreen();
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleFitToScreen}
          className="h-8 w-8"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-950"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          ref={canvasRef}
          className="relative"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
        >
          <svg
            width="10000"
            height="10000"
            style={{
              position: 'absolute',
              left: '-5000px',
              top: '-5000px',
            }}
          >
            {renderConnections(rootNode)}
            {renderActionCard(rootNode)}
          </svg>
        </div>
      </div>
    </div>
  );
};