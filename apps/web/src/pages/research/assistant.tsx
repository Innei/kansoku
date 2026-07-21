import { useProRoutes } from '@web/features/edition/useProRoutes';
import { ResearchAssistantPage } from '@web/features/research/ResearchAssistantPage';

export function Component() {
  const proRoutes = useProRoutes();
  const ProAssistant = proRoutes?.['/research/assistant'];
  if (ProAssistant) return <ProAssistant />;
  return <ResearchAssistantPage />;
}
