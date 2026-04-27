import './App.css';
import React, { Suspense, lazy } from "react";
import {
  Route,
  Routes,
} from "react-router-dom";

const MainPage = lazy(() => import("./components/pages/MainPage.tsx"));

function AppFallback() {
  return <div style={{ padding: 16 }}>Loading page...</div>;
}

function App() {
  return (
    <React.StrictMode>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/*" element={<MainPage />} />
        </Routes>
      </Suspense>
    </React.StrictMode>
  );
}

export default App;
