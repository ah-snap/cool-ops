import '../../../stylesheets/navigation.css';
import NavigationLink from './NavigationLink';

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
          <NavigationLink to={'/pspLookup'}>PSP Lookup</NavigationLink>
          <NavigationLink to={'/bulkMissingLicenses'}>Bulk Missing Licenses</NavigationLink>
          <NavigationLink to={'/bulkWhiteLabelAssist'}>Bulk White Label Assist</NavigationLink>
          <NavigationLink to={'/bulkRevokeLicenses'}>Bulk Revoke Licenses</NavigationLink>
          <NavigationLink to={'/managePortForwards'}>Manage Port Forwards</NavigationLink>
        </ul>
      </div>
    </div>
  );
}

export default NavigationBar;
