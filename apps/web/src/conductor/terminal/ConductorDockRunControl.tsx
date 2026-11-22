import type { EnvironmentId, ProjectScript } from "@t3tools/contracts";

import ProjectScriptsControl, {
  type NewProjectScriptInput,
  type ProjectScriptActionResult,
} from "~/components/ProjectScriptsControl";
import { useT3ProjectFileScripts } from "~/hooks/useT3ProjectFileScripts";

interface ConductorDockRunControlProps {
  readonly environmentId: EnvironmentId;
  readonly gitCwd: string | null;
  readonly scripts: ReadonlyArray<ProjectScript>;
  readonly preferredScriptId: string | null;
  readonly onRunScript: (script: ProjectScript) => void;
  readonly onAddScript: (input: NewProjectScriptInput) => Promise<ProjectScriptActionResult>;
  readonly onUpdateScript: (
    scriptId: string,
    input: NewProjectScriptInput,
  ) => Promise<ProjectScriptActionResult>;
  readonly onDeleteScript: (scriptId: string) => Promise<ProjectScriptActionResult>;
}

/** The project script Run button in the terminal dock header, as in Conductor. */
export function ConductorDockRunControl(props: ConductorDockRunControlProps) {
  const fileScripts = useT3ProjectFileScripts(props.environmentId, props.gitCwd);
  return (
    <ProjectScriptsControl
      displayMode="titlebar"
      environmentId={props.environmentId}
      scripts={props.scripts}
      fileScripts={fileScripts}
      preferredScriptId={props.preferredScriptId}
      onRunScript={props.onRunScript}
      onAddScript={props.onAddScript}
      onUpdateScript={props.onUpdateScript}
      onDeleteScript={props.onDeleteScript}
    />
  );
}
