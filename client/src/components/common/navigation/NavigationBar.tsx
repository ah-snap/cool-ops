import '../../../stylesheets/navigation.css';
import NavigationLink from './NavigationLink.tsx';
import PortForwardsStatusIndicator from './PortForwardsStatusIndicator.tsx';
import TestUserActiveIndicator from './TestUserActiveIndicator.tsx';

function NavigationBar() {
  return (
    <div className="navigationWrapper">
      <div className="navigationContainer">
        <h1>Navigation</h1>
        <ul>
          <li>Home</li>
          <NavigationLink to={'/accounts'}>Accounts</NavigationLink>
          <NavigationLink to={'/dealer'}>Dealers</NavigationLink>
          <NavigationLink to={'/users'}>Users</NavigationLink>
          <NavigationLink to={'/bulk'}>Bulk Updates</NavigationLink>
          <NavigationLink to={'/managePortForwards'}>Manage Port Forwards</NavigationLink>
          <NavigationLink to={'/settings'}>Settings</NavigationLink>
          <TestUserActiveIndicator />
          <PortForwardsStatusIndicator />
        </ul>
      </div>
    </div>
  );
}

export default NavigationBar;
