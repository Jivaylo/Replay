import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  session: any;
  children: ReactNode;
}

function ProtectedRoute({ session, children }: Props) {
  if (!session) {

    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;


