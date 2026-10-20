/**
 * Global DOM Safety Guard for Next.js & React 18
 * 
 * Intercepts Node.prototype.insertBefore and Node.prototype.removeChild
 * to gracefully handle DOM mutations caused by browser extensions & translation tools
 * (Google Translate, Safari Translate, Edge Translate, Grammarly, Password Managers, autofill)
 */

export function installDomGuard() {
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;

  const w = window as any;
  if (w.__REPLYX_DOM_GUARD_INSTALLED__) return;
  w.__REPLYX_DOM_GUARD_INSTALLED__ = true;

  // 1. Safe insertBefore
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newChild: T, refChild: Node | null): T {
    if (refChild && refChild.parentNode !== this) {
      if (refChild.parentNode) {
        return refChild.parentNode.insertBefore(newChild, refChild);
      }
      return this.appendChild(newChild);
    }
    return originalInsertBefore.call(this, newChild, refChild) as T;
  };

  // 2. Safe removeChild
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

if (typeof window !== 'undefined') {
  installDomGuard();
}

export default installDomGuard;

