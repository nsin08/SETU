import React from "react";
import TerminalPane from "./components/TerminalPane";

export default function App() {
  return (
    <div className="h-full w-full bg-gray-950 text-gray-100">
      <div className="p-3 text-sm font-medium border-b border-gray-800">
        Setu — Phase 1
      </div>
      <div className="h-[calc(100%-40px)]">
        <TerminalPane />
      </div>
    </div>
  );
}
