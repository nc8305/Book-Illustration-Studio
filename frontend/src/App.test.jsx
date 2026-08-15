import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Frontend UI Tests - App Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows Identity Login screen initially', () => {
    render(<App />);
    expect(screen.getByText('Welcome to Gradion Studio')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('transitions to Project List after login', () => {
    render(<App />);
    
    // Simulate login
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Can' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'can@example.com' } });
    fireEvent.click(screen.getByText('Sign In'));

    // Should now see Project List
    expect(screen.getByText('Your Projects')).toBeInTheDocument();
    expect(screen.getByText('Hello, Can')).toBeInTheDocument();
  });
});
