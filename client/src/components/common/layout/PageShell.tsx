import React from "react";
import "./pageShell.css";

type PageShellProps = {
  children: React.ReactNode;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
};

export default function PageShell({ children, containerClassName = "", containerStyle }: PageShellProps) {
  const className = ["pageShellContainer", containerClassName].filter(Boolean).join(" ");

  return (
    <div className="pageShellWrapper categories">
      <div className={className} style={containerStyle}>
        {children}
      </div>
    </div>
  );
}
