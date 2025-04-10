import '../stylesheets/navigation.css';
import NavigationLink from "./NavigationLink";

function NavigationBar() {
    return (
        <div className="navigationWrapper">
            <div className="navigationContainer">
            <h1>Navigation</h1>
            <ul>
                <li>Home</li>
                <NavigationLink to={"/mapping"}>Mapping</NavigationLink>
                <NavigationLink to={"/licenses"}>Licenses</NavigationLink>
                <NavigationLink to={"/showroomDemoLicenses"}>Showroom Demo Licenses</NavigationLink>
            </ul>
    </div></div>);
}

export default NavigationBar;
