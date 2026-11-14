import React from 'react';

// Ml → jl → Cl/Al: after block scheduling and whole-document remark both
// fail, show plain text under the existing message/session owner key.
export class SourceResponseBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() {
    // No error payload, stack or response content is sent or persisted here.
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="source-markdown" data-response-fallback="text">
      <div style={{whiteSpace: 'pre-wrap'}}>{this.props.text}</div>
    </div>;
  }
}

// Incremental scheduling can fail independently of the whole-document remark
// renderer. Latch this owner onto the latter before the outer text fallback.
export class SourceBlockBoundary extends React.Component {
  state = {failed:false,terminal:false};
  failTerminal=error=>{
    // Transient handoff only: the outer text boundary immediately unmounts
    // this subtree. Do not serialize/log the error or put it in app state.
    this.terminalError=error;
    this.setState({terminal:true});
  };
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFallback?.();}
  render(){
    if(this.state.terminal)throw this.terminalError;
    return this.state.failed?<RemarkFallbackGuard onError={this.failTerminal}>{this.props.fallback}</RemarkFallbackGuard>:this.props.children;
  }
}

// A layout-effect failure in the fallback must not repeatedly schedule the
// same fallback on its parent boundary. Stop rendering it and hand it outward.
class RemarkFallbackGuard extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){this.props.onError(error);}
  render(){return this.state.failed?null:this.props.children;}
}
