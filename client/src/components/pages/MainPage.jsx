import React, { useState } from "react";
import '../../App.css';
import NavigationBar from "../NavigationBar";
import TodoPage from "./TodoPage";
import {
  Route,
  Routes
} from "react-router-dom";
import MappingPage from "./MappingPage.tsx";
import AdyenStitchingPage from "./AdyenStitchingPage";
import DCodeValidationPage from "./DCodeValidationPage";
import AdyenStitchingPage2 from "./AdyenStitchingPage2";
import LicensesPage from "./LicensesPage.tsx";
import ShowroomDemoLicensesPage from "./ShowroomDemoLicensesPage.tsx";

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
          <Routes>
            <Route path="/mapping" element={<MappingPage />} />
            <Route path="/licenses" element={<LicensesPage />} />
            <Route path="/showroomDemoLicenses" element={<ShowroomDemoLicensesPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/adyen" element={<AdyenStitchingPage />} />
            <Route path="/adyenv2" element={<AdyenStitchingPage2 />} />
            <Route path="/customerMapping" element={<DCodeValidationPage />} />
          </Routes>
        </React.StrictMode>
      </div>
    </div>
    
  );
}

export default MainPage;
