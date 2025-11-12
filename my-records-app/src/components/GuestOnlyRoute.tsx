
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  session: any;
  children: ReactNode;
}

function GuestOnlyRoute({ session, children }: Props) {
  if (session) {
    
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default GuestOnlyRoute;
