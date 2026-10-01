import { Component } from 'react';

// Shows `fallback` instead of taking the whole page down when something inside
// fails (no WebGL, a script chunk that didn't download, a bug in one section).
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
