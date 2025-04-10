import React from "react";
import '../stylesheets/navigation.css';
import {useNavigate} from 'react-router-dom';

function NavigationLink({to, onClick, children, show = true}) {
    const navigate = useNavigate();

    if (!show) return null;
    
    return (
        <li className="link" onClick={onClick || (() => navigate(to))}>
            {children}
        </li>);
}

export default NavigationLink;
