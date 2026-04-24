import type { MouseEventHandler, ReactNode } from 'react';
import '../../../stylesheets/navigation.css';
import { useNavigate } from 'react-router-dom';

interface NavigationLinkProps {
  to: string;
  onClick?: MouseEventHandler<HTMLLIElement>;
  children: ReactNode;
  show?: boolean;
}

function NavigationLink({ to, onClick, children, show = true }: NavigationLinkProps) {
  const navigate = useNavigate();

  if (!show) {
    return null;
  }

  return (
    <li className="link" onClick={onClick || (() => navigate(to))}>
      {children}
    </li>
  );
}

export default NavigationLink;
