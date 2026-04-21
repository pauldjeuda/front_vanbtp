import React from 'react';
import { Card } from '../../components/ui';

interface SubcontractingTabProps {
  [key: string]: any;
}

export const SubcontractingTab = (_props: SubcontractingTabProps) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900">Sous-traitance</h3>
        <p className="text-sm text-slate-500 mt-2">
          Ce composant extrait a été neutralisé pour éviter les erreurs de compilation. La logique active reste gérée dans <code>Resources/index.tsx</code>.
        </p>
      </Card>
    </div>
  );
};
