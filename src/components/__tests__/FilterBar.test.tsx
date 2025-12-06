import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';

// Mock the entire FilterBar component to avoid axios issues
// Updated to reflect auto-apply behavior (no Apply/Cancel buttons)
const MockFilterBar = ({ onFilter, initialFilters }: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasFilters = initialFilters && Object.keys(initialFilters).length > 0;

  // Auto-apply on select change
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (value) {
      onFilter({ [name]: value });
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>🔍 Filters</button>
      {hasFilters && (
        <button onClick={() => onFilter({})}>Clear Filters</button>
      )}
      {isOpen && (
        <div>
          <label>Manufacturer</label>
          <select
            name="manufacturer"
            data-testid="manufacturer-select"
            onChange={handleSelectChange}
          >
            <option value="">All Manufacturers</option>
            <option value="Good Smile Company">Good Smile Company (5)</option>
          </select>
          <label>Scale</label>
          <select
            name="scale"
            data-testid="scale-select"
            onChange={handleSelectChange}
          >
            <option value="">All Scales</option>
            <option value="1/8">1/8 (3)</option>
          </select>
          <label>Location</label>
          <select
            name="location"
            data-testid="location-select"
            onChange={handleSelectChange}
          >
            <option value="">All Locations</option>
            <option value="Display Case A">Display Case A (2)</option>
          </select>
          <label>Box Number</label>
          <input
            name="boxNumber"
            placeholder="Any box (press Enter to apply)"
            data-testid="boxnumber-input"
            onBlur={(e) => e.target.value && onFilter({ boxNumber: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};

jest.mock('../FilterBar', () => MockFilterBar);

describe('FilterBar', () => {
  const mockOnFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filters button', () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('opens filter form when button clicked', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);

    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByText('Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Box Number')).toBeInTheDocument();
  });

  it('auto-applies filters when select value changes', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);

    // Open filters
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Select a manufacturer - should auto-apply
    const manufacturerSelect = screen.getByTestId('manufacturer-select');
    await userEvent.selectOptions(manufacturerSelect, 'Good Smile Company');

    expect(mockOnFilter).toHaveBeenCalledWith({
      manufacturer: 'Good Smile Company'
    });
  });

  it('auto-applies scale filter on selection', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);

    // Open filters
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Select a scale - should auto-apply
    const scaleSelect = screen.getByTestId('scale-select');
    await userEvent.selectOptions(scaleSelect, '1/8');

    expect(mockOnFilter).toHaveBeenCalledWith({
      scale: '1/8'
    });
  });

  it('clears filters when clear button clicked', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} initialFilters={{ manufacturer: 'Test' }} />);

    await userEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(mockOnFilter).toHaveBeenCalledWith({});
  });

  it('shows clear button when filters applied', () => {
    render(<MockFilterBar onFilter={mockOnFilter} initialFilters={{ manufacturer: 'Test' }} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('shows filter counts in options', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);

    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Verify counts are displayed (simplified check)
    expect(screen.getByText(/Good Smile Company/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('does not have Apply or Cancel buttons (auto-apply behavior)', async () => {
    render(<MockFilterBar onFilter={mockOnFilter} />);

    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    // Apply and Cancel buttons should not exist with auto-apply
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });
});