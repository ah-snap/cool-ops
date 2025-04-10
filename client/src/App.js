import './App.css';
import React from "react";
import MainPage from "./components/pages/MainPage";
import {
  Route,
  Routes,
} from "react-router-dom";

function App() {
  return (
    <React.StrictMode>
      <Routes>
        <Route path="/*" element={<MainPage />} />
      </Routes>
    </React.StrictMode>
  );
}

export default App;
