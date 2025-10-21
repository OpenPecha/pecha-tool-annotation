import { useAuth } from '../auth/use-auth-hook';

export default function Logout() {
  const { logout } = useAuth()
  logout()
  return <div>Logout</div>;
}
