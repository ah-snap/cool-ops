import React, { Suspense, lazy, useState } from "react";
import '../../App.css';
import NavigationBar from "../common/navigation/NavigationBar.jsx";
import {
  Route,
  Routes
} from "react-router-dom";

const MappingPage = lazy(() => import("./mapping/index.ts"));
const DCodeValidationPage = lazy(() => import("./dcodeValidation/index.ts"));
const ShowroomDemoLicensesPage = lazy(() => import("./showroomDemoLicenses/index.ts"));
const MissingLicensePage = lazy(() => import("./missingLicense/index.ts"));
const PSPLookup = lazy(() => import("./pspLookup/index.ts"));
const BulkMissingLicensesPage = lazy(() => import("./bulkMissingLicenses/index.ts"));
const DealerPage = lazy(() => import("./dealerPage/index.tsx"));
const BulkWhiteLabelAssist = lazy(() => import("./bulkWhiteLabelAssist/index.ts"));
const BulkRevokeLicensePage = lazy(() => import("./bulkRevokeLicenses/index.ts"));
const ManagePortForwardsPage = lazy(() => import("./managePortForwards/ManagePortForwardsPage.tsx"));
const LicenseDetailsPage = lazy(() => import("./licenseDetails/LicenseDetailsPage.tsx"));

function PageFallback() {
  return <div style={{ padding: 16 }}>Loading section...</div>;
}

function MainPage() {
  const [date, setDate] = useState(new Date());
  const [options, setOptions] = useState(() => {
    const saved = localStorage.getItem("options");
    const initialValue = JSON.parse(saved);
    return initialValue || {};
  });

  const setDateAndClear = (date) => {
    setDate(date);
  };

  const setOptionsAndClear = (options) => {
    localStorage.setItem("options", JSON.stringify(options));
    setOptions(options);
  }

  return (
    <div className="categories" style={{display: "flex", overflow: "hidden"}}>
      <NavigationBar date={date} setDate={setDateAndClear} options={options} setOptions={setOptionsAndClear} />
      <div style={{overflowY: "scroll", height: "100vh", width: "100%"}}>
        <React.StrictMode>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/mapping" element={<MappingPage />} />
              <Route path="/licenses" element={<MissingLicensePage />} />
              <Route path="/showroomDemoLicenses" element={<ShowroomDemoLicensesPage />} />
              <Route path="/customerMapping" element={<DCodeValidationPage />} />
              <Route path="/pspLookup" element={<PSPLookup />} />
              <Route path="/bulkMissingLicenses" element={<BulkMissingLicensesPage />} />
              <Route path="/bulkWhiteLabelAssist" element={<BulkWhiteLabelAssist />} />
              <Route path="/bulkRevokeLicenses" element={<BulkRevokeLicensePage />} />
              <Route path="/managePortForwards" element={<ManagePortForwardsPage />} />
              <Route path="/dealer" element={<DealerPage />} />
              <Route path="licenseDetails/:type/:value" element={<LicenseDetailsPage />} />
              <Route path="/licenseDetails/:type/:value" element={<LicenseDetailsPage />} />
            </Routes>
          </Suspense>
        </React.StrictMode>
      </div>
    </div>
    
  );
}

export default MainPage;
