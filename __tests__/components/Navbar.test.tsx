/**
 * Tests for Navbar component
 * 
 * Tests navigation bar rendering, layout, and child components integration
 */

import { render, screen } from '@testing-library/react';
import Navbar from '@/components/navbar/Navbar';

// Mock child components
jest.mock('@/components/navbar/Logo', () => {
  return function MockLogo() {
    return <div data-testid="logo">Logo</div>;
  };
});

jest.mock('@/components/navbar/NavSearch', () => {
  return function MockNavSearch() {
    return <input data-testid="nav-search" placeholder="find a property..." />;
  };
});

jest.mock('@/components/navbar/DarkMode', () => {
  return function MockDarkMode() {
    return <button data-testid="dark-mode-toggle">Theme Toggle</button>;
  };
});

jest.mock('@/components/navbar/LinksDropdown', () => {
  return function MockLinksDropdown() {
    return <button data-testid="links-dropdown">Menu</button>;
  };
});

describe('Navbar', () => {
  it('should render all main components', () => {
    render(<Navbar />);

    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByTestId('nav-search')).toBeInTheDocument();
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('links-dropdown')).toBeInTheDocument();
  });

  it('should have correct semantic HTML structure', () => {
    render(<Navbar />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('border-b');
  });

  it('should have responsive layout classes', () => {
    render(<Navbar />);

    const container = screen.getByRole('navigation').querySelector('.container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass(
      'flex',
      'flex-col',
      'sm:flex-row',
      'sm:justify-between',
      'sm:items-center'
    );
  });

  it('should render components in correct order', () => {
    render(<Navbar />);

    const nav = screen.getByRole('navigation');
    const container = nav.querySelector('.container');
    
    // Check order: Logo, NavSearch, then controls (DarkMode + LinksDropdown)
    const children = Array.from(container?.children || []);
    expect(children[0]).toContainElement(screen.getByTestId('logo'));
    expect(children[1]).toContainElement(screen.getByTestId('nav-search'));
    expect(children[2]).toContainElement(screen.getByTestId('dark-mode-toggle'));
    expect(children[2]).toContainElement(screen.getByTestId('links-dropdown'));
  });

  it('should have correct spacing and padding', () => {
    render(<Navbar />);

    const container = screen.getByRole('navigation').querySelector('.container');
    expect(container).toHaveClass('gap-4', 'py-8');
  });
});

