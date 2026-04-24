import '../../../stylesheets/navigation.css';
import NavigationLink from './NavigationLink.tsx';
import PortForwardsStatusIndicator from './PortForwardsStatusIndicator.tsx';

function NavigationBar() {
  return (
    <div className="navigationWrapper">
      <div className="navigationContainer">
        <h1>Navigation</h1>
        <ul>
          <li>Home</li>
          <NavigationLink to={'/mapping'}>Mapping</NavigationLink>
          <NavigationLink to={'/licenses'}>Licenses</NavigationLink>
          <NavigationLink to={'/dealer'}>Dealers</NavigationLink>
          <NavigationLink to={'/users'}>Users</NavigationLink>
          <NavigationLink to={'/bulk'}>Bulk Updates</NavigationLink>
          <NavigationLink to={'/managePortForwards'}>Manage Port Forwards</NavigationLink>
          <PortForwardsStatusIndicator />
        </ul>
      </div>
    </div>
  );
}

export default NavigationBar;
