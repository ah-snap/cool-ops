import '../../../stylesheets/categories.css';
import NavigationLink from '../../common/navigation/NavigationLink';

export default function BulkUpdates() {
  return (
    <div className="categoryContainer" style={{ padding: "20px" }}>
      <h1>Bulk Updates</h1>
      <ul>
        <NavigationLink to="/bulkMissingLicenses">Bulk Missing Licenses</NavigationLink>
        <NavigationLink to="/bulkWhiteLabelAssist">Bulk White Label Assist</NavigationLink>
        <NavigationLink to="/bulkRevokeLicenses">Bulk Revoke Licenses</NavigationLink>
      </ul>
    </div>
  );
}