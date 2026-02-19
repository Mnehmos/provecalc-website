/**
 * Symmetric API Command Protocol
 *
 * AI and User use identical operations. The AI proposes commands in this format,
 * the frontend validates and executes them through the same store actions.
 */

/** All supported command types */
export type CommandType =
  | 'add_given'
  | 'add_equation'
  | 'add_constraint'
  | 'add_solve_goal'
  | 'add_text'
  | 'add_annotation'
  | 'update_node'
  | 'delete_node'
  | 'add_assumption'
  | 'remove_assumption'
  | 'verify_node'
  | 'verify_all';

/** Base command structure */
interface BaseCommand {
  action: CommandType;
  reasoning?: string;
}

/** Add a given (known value) node */
export interface AddGivenCommand extends BaseCommand {
  action: 'add_given';
  symbol: string;
  value: number;
  unit?: string;
  description?: string;
}

/** Add an equation node */
export interface AddEquationCommand extends BaseCommand {
  action: 'add_equation';
  latex: string;
  lhs: string;
  rhs: string;
}

/** Add a constraint node */
export interface AddConstraintCommand extends BaseCommand {
  action: 'add_constraint';
  latex: string;
  sympy: string;
  applies_to?: string[];
}

/** Add a solve goal node */
export interface AddSolveGoalCommand extends BaseCommand {
  action: 'add_solve_goal';
  target: string;
  method?: 'symbolic' | 'numeric' | 'auto';
}

/** Add a text node */
export interface AddTextCommand extends BaseCommand {
  action: 'add_text';
  content: string;
}

/** Add an annotation node */
export interface AddAnnotationCommand extends BaseCommand {
  action: 'add_annotation';
  content: string;
  title?: string;
}

/** Update an existing node */
export interface UpdateNodeCommand extends BaseCommand {
  action: 'update_node';
  node_id: string;
  updates: Record<string, unknown>;
}

/** Delete a node */
export interface DeleteNodeCommand extends BaseCommand {
  action: 'delete_node';
  node_id: string;
}

/** Add an assumption */
export interface AddAssumptionCommand extends BaseCommand {
  action: 'add_assumption';
  statement: string;
  formal_expression?: string;
  scope?: string[];
}

/** Remove an assumption */
export interface RemoveAssumptionCommand extends BaseCommand {
  action: 'remove_assumption';
  assumption_id: string;
}

/** Verify a single node */
export interface VerifyNodeCommand extends BaseCommand {
  action: 'verify_node';
  node_id: string;
}

/** Verify all nodes */
export interface VerifyAllCommand extends BaseCommand {
  action: 'verify_all';
}

/** Union of all command types */
export type WorksheetCommand =
  | AddGivenCommand
  | AddEquationCommand
  | AddConstraintCommand
  | AddSolveGoalCommand
  | AddTextCommand
  | AddAnnotationCommand
  | UpdateNodeCommand
  | DeleteNodeCommand
  | AddAssumptionCommand
  | RemoveAssumptionCommand
  | VerifyNodeCommand
  | VerifyAllCommand;

/** A batch of commands from the AI */
export interface CommandBatch {
  commands: WorksheetCommand[];
  summary?: string;
}

/** Result of executing a single command */
export interface CommandResult {
  command: WorksheetCommand;
  success: boolean;
  error?: string;
}

/** Result of executing a batch */
export interface BatchResult {
  results: CommandResult[];
  total: number;
  succeeded: number;
  failed: number;
}
