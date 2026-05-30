export enum AuthEventType {
  USER_REGISTERED = "user.registered",
}

export interface AuthEvent {
  eventType: AuthEventType | string;
  userId?: number;
  email: string;
  timestamp: number;
  [key: string]: any;
}
export interface UserRegisteredEvent extends AuthEvent {
  eventType: AuthEventType.USER_REGISTERED;
  userId: number;
  name: string;
}
