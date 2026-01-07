/**
 * Tests for CategoriesList component
 * 
 * Tests category filtering, active state, and link generation
 */

import { render, screen } from '@testing-library/react';
import CategoriesList from '@/components/home/CategoriesList';
import { categories } from '@/utils/categories';

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock ScrollArea component
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
  ScrollBar: ({ orientation }: { orientation: string }) => (
    <div data-testid="scroll-bar" data-orientation={orientation} />
  ),
}));

describe('CategoriesList', () => {
  it('should render all categories', () => {
    render(<CategoriesList />);

    categories.forEach((category) => {
      expect(screen.getByText(category.label)).toBeInTheDocument();
    });
  });

  it('should generate correct links for categories without search', () => {
    render(<CategoriesList />);

    categories.forEach((category) => {
      const link = screen.getByText(category.label).closest('a');
      expect(link).toHaveAttribute('href', `/?category=${category.label}`);
    });
  });

  it('should include search parameter in links when provided', () => {
    render(<CategoriesList search="beach" />);

    categories.forEach((category) => {
      const link = screen.getByText(category.label).closest('a');
      expect(link).toHaveAttribute('href', `/?category=${category.label}&search=beach`);
    });
  });

  it('should highlight active category', () => {
    const activeCategory = categories[0];
    render(<CategoriesList category={activeCategory.label} />);

    const activeLink = screen.getByText(activeCategory.label).closest('article');
    expect(activeLink).toHaveClass('text-primary');
  });

  it('should not highlight inactive categories', () => {
    const activeCategory = categories[0];
    render(<CategoriesList category={activeCategory.label} />);

    const inactiveCategories = categories.slice(1);
    inactiveCategories.forEach((category) => {
      const link = screen.getByText(category.label).closest('article');
      expect(link).not.toHaveClass('text-primary');
    });
  });

  it('should render category icons', () => {
    render(<CategoriesList />);

    categories.forEach((category) => {
      // Each category should have an icon (rendered as SVG or icon component)
      const categoryItem = screen.getByText(category.label).closest('article');
      expect(categoryItem).toBeInTheDocument();
      // Icon is rendered via <item.icon className='w-8 h-8' />
      // We can verify the article contains the icon by checking for the className
      const icon = categoryItem?.querySelector('.w-8.h-8');
      expect(icon).toBeInTheDocument();
    });
  });

  it('should have correct hover styles', () => {
    render(<CategoriesList />);

    const firstCategory = screen.getByText(categories[0].label).closest('article');
    expect(firstCategory).toHaveClass('hover:text-primary');
  });

  it('should have correct layout classes', () => {
    render(<CategoriesList />);

    const scrollArea = screen.getByTestId('scroll-area');
    expect(scrollArea).toHaveClass('py-6');

    const container = scrollArea.querySelector('.flex');
    expect(container).toHaveClass('gap-x-4');
  });

  it('should render ScrollBar with horizontal orientation', () => {
    render(<CategoriesList />);

    const scrollBar = screen.getByTestId('scroll-bar');
    expect(scrollBar).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('should handle undefined category gracefully', () => {
    render(<CategoriesList />);

    // All categories should render without active state
    categories.forEach((category) => {
      const link = screen.getByText(category.label).closest('article');
      expect(link).not.toHaveClass('text-primary');
    });
  });

  it('should handle empty search string', () => {
    render(<CategoriesList search="" />);

    categories.forEach((category) => {
      const link = screen.getByText(category.label).closest('a');
      // Empty search should not add search parameter
      expect(link).toHaveAttribute('href', `/?category=${category.label}`);
    });
  });

  it('should capitalize category labels', () => {
    render(<CategoriesList />);

    categories.forEach((category) => {
      const labelElement = screen.getByText(category.label);
      const paragraph = labelElement.closest('p');
      expect(paragraph).toHaveClass('capitalize');
    });
  });
});

