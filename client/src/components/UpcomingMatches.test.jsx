import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock API service
vi.mock('../services/api.js', () => ({
  default: {
    getUpcomingGames: vi.fn()
  }
}))

// Mock config
vi.mock('../config/env.js', () => ({
  default: {
    features: {
      refreshInterval: 60000 // 1 minute for tests
    }
  }
}))

import UpcomingMatches from './UpcomingMatches'
import apiService from '../services/api.js'

describe('UpcomingMatches Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock response
    apiService.getUpcomingGames.mockResolvedValue({
      success: true,
      data: [],
      demo_mode: false,
      message: 'No matches found'
    })
  })

  it('renders loading state initially', () => {
    // Mock API call that never resolves
    apiService.getUpcomingGames.mockImplementation(() => new Promise(() => {}))
    
    render(<UpcomingMatches />)
    
    expect(screen.getByText(/Loading upcoming matches/i)).toBeInTheDocument()
  })

  it('renders empty state when no matches available', async () => {
    render(<UpcomingMatches />)
    
    // Wait for loading to complete
    await screen.findByText(/No upcoming matches/i)
    
    expect(screen.getByText(/No upcoming matches/i)).toBeInTheDocument()
  })
})
