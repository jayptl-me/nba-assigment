import { render, screen } from '@testing-library/react';
import App from './App';

test('renders NBA Live Tracker', () => {
  render(<App />);
  const headerElement = screen.getByText(/NBA Live Tracker/i);
  expect(headerElement).toBeInTheDocument();
});
