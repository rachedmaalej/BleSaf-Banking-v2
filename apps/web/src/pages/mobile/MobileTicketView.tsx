import { useParams, Navigate } from 'react-router-dom';

export default function MobileTicketView() {
  const { ticketId } = useParams<{ ticketId: string }>();

  // Redirect to the status page
  return <Navigate to={`/status/${ticketId}`} replace />;
}
