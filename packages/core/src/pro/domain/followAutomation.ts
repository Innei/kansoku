export interface FollowAutomation {
  requestImmediateFollow(symbol: string): Promise<void> | void;
}
