import type { MouseEventHandler, ReactNode } from 'react';
import '../../../stylesheets/navigation.css';
import { Link } from 'react-router-dom';

interface NavigationLinkProps {
  to: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
  show?: boolean;
}

function NavigationLink({ to, onClick, children, show = true }: NavigationLinkProps) {
  if (!show) {
    return null;
  }

  return (
    <li>
      <Link className="link" to={to} onClick={onClick} style={{ display: 'block' }}>
        {children}
      </Link>
    </li>
  );
}

export default NavigationLink;
