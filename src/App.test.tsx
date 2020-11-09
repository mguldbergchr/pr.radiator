import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders settings-form', () => {
  const { getByText } = render(<App />);
  const headerElement = getByText(/Configure PR Radiator/i);
  expect(headerElement).toBeInTheDocument();
});
