import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock the components before importing App
vi.mock('./components/UpcomingMatches.jsx', () => ({
  default: () => <div data-testid="upcoming-matches">Mocked UpcomingMatches</div>
}))

vi.mock('./components/Header.jsx', () => ({
  default: () => <header data-testid="header">NBA Live Tracker</header>
}))

import App from './App'

describe('App Component', () => {
  it('renders NBA Live Tracker header', () => {
    render(<App />)
    const headerElement = screen.getByText(/NBA Live Tracker/i)
    expect(headerElement).toBeInTheDocument()
  })

  it('renders the main content container', () => {
    render(<App />)
    const mainElement = screen.getByRole('main')
    expect(mainElement).toBeInTheDocument()
    expect(mainElement).toHaveClass('main-content')
  })

  it('renders the UpcomingMatches component', () => {
    render(<App />)
    const upcomingMatchesElement = screen.getByTestId('upcoming-matches')
    expect(upcomingMatchesElement).toBeInTheDocument()
  })
})
