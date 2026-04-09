import React, { Suspense, lazy, useState } from "react";
import '../../App.css';
import '../../stylesheets/categories.css';
import NavigationBar from "../NavigationBar";
import {
  Route,
  Routes
} from "react-router-dom";

const MappingPage = lazy(() => import("./MappingPage.tsx"));
const DCodeValidationPage = lazy(() => import("./DCodeValidationPage"));
const ShowroomDemoLicensesPage = lazy(() => import("./ShowroomDemoLicensesPage.tsx"));
const MissingLicensePage = lazy(() => import("./MissingLicensePage.tsx"));
const PSPLookup = lazy(() => import("./PSPLookup.tsx"));
const BulkMissingLicensesPage = lazy(() => import("./BulkMissingLicensesPage.tsx"));
const BulkWhiteLabelAssist = lazy(() => import("./BulkWhiteLabelAssist.tsx"));
const BulkRevokeLicensePage = lazy(() => import("./BulkRevokeLicensePage.tsx"));

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
    <div style={{display: "flex", overflow: "hidden"}}>
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
            </Routes>
          </Suspense>
        </React.StrictMode>
      </div>
    </div>
    
  );
}

export default MainPage;
