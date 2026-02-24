export interface IAuditLog {
  user_id?: string;
  user_name?: string;
  restaurant_id?: string;
  action: string;
  resource: string;
  payload?: any;
  changes?: {
    before: any;
    after: any;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}
