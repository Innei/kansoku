import type { ResearchDocument, ResearchDocumentMeta } from '@kansoku/core/contract/index';
import { useFeature } from '@web/features/edition/useFeature';
import { useProComposition } from '@web/features/edition/useProComposition';
import { LockedAiNotice } from '../cockpit/LockedAiNotice';
import { RelatedMaterialsCard } from './RelatedMaterialsCard';

export interface ResearchAssistantProps {
  document: ResearchDocument;
  selected: ResearchDocumentMeta;
  related: ResearchDocumentMeta[];
  onSelect: (document: ResearchDocumentMeta) => void;
  onDocumentChanged: (document?: ResearchDocument) => void;
}

export function ResearchAssistant({
  document,
  selected,
  related,
  onSelect,
  onDocumentChanged,
}: ResearchAssistantProps) {
  const { state } = useFeature('research-ai');
  const { status, composition } = useProComposition();

  if (state === 'absent') {
    return (
      <div className="research-assistant research-assistant--locked">
        <RelatedMaterialsCard selected={selected} related={related} onSelect={onSelect} />
      </div>
    );
  }

  if (state === 'locked') {
    return (
      <div className="research-assistant research-assistant--locked">
        <RelatedMaterialsCard selected={selected} related={related} onSelect={onSelect} />
        <LockedAiNotice message="研究库 AI（刷新文档 / 编辑审阅 / 研究对话）需要有效授权" />
      </div>
    );
  }

  const Panel = composition?.researchAssistantPanel;
  if (status === 'loading' || !Panel) {
    return (
      <div className="research-assistant research-assistant--locked">
        <RelatedMaterialsCard selected={selected} related={related} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <Panel
      document={document}
      selected={selected}
      related={related}
      onSelect={onSelect}
      onDocumentChanged={onDocumentChanged}
    />
  );
}
