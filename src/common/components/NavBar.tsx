import { Icon } from '@fluentui/react/lib/Icon';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { useLocation, useNavigate } from 'react-router-dom';

const navBarStyles = mergeStyles({
  height: 48,
  backgroundColor: '#F1F1F1',
  borderBottom: '1px solid #e1e1e1',
});

const appTitleStyles = mergeStyles({
  fontWeight: 600,
  fontSize: 16,
  paddingLeft: 12,
  lineHeight: 48,
});

const pivotStyles = mergeStyles({
  paddingLeft: 20,
});

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = location.pathname === '/failures' ? 'failures' : 
                    location.pathname === '/ai-assistance' ? 'ai-assistance' : 'editor';

  const onTabChange = (item?: PivotItem) => {
    if (item?.props.itemKey === 'failures') {
      navigate('/failures');
    } else if (item?.props.itemKey === 'ai-assistance') {
      navigate('/ai-assistance');
    } else {
      navigate('/');
    }
  };

  return (
    <Stack horizontal className={navBarStyles}>
      <div className={appTitleStyles}>
        <Icon iconName="TriggerAuto" />
        <span> Power Automate Tools</span>
      </div>
      <div className={pivotStyles}>
        <Pivot
          selectedKey={currentTab}
          onLinkClick={onTabChange}
          headersOnly={true}
        >
          <PivotItem headerText="Flow Editor" itemKey="editor" />
          <PivotItem headerText="Previous Flows" itemKey="failures" />
          <PivotItem headerText="AI Assistance" itemKey="ai-assistance" />
        </Pivot>
      </div>
    </Stack>
  );
};
