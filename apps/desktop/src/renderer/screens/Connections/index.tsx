// apps/desktop/src/renderer/screens/Connections/index.tsx
import React, { useState } from "react";
import ConnectionsList from "./ConnectionsList";
import ConnectionDetails from "./ConnectionDetails";

export default function ConnectionsScreen() {
  const [alias, setAlias] = useState<string | undefined>(undefined);
  return (
    <div className="grid grid-cols-3 h-full">
      <div className="col-span-1 border-r">
        <ConnectionsList onPick={setAlias} />
      </div>
      <div className="col-span-2">
        <ConnectionDetails alias={alias} />
      </div>
    </div>
  );
}
