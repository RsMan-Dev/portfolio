declare global {
  interface HTMLDialogElement {
    closeModal(value: any): void
  }
}


/*
  will make the dialog close in this order:
  will add the hide class: <dialog ... open class="hide">
  will cause a fade out animation that we can liseten the end to in
  js to trigger the close event, that will remove the open attribute
*/
export function closeModalFn(this: HTMLDialogElement, value: any) {
  this.classList.add("hide")
  this.addEventListener('animationend', function _dialogAnimationEndEventFunction() {
    this.classList.remove('hide');
    this.close(value);
    this.returnValue = value;
    let ev = new Event("close");
    this.dispatchEvent(ev);
    this.removeEventListener('animationend', _dialogAnimationEndEventFunction, false);
  }, false);
}

if (window.HTMLDialogElement != undefined) {
  HTMLDialogElement.prototype.closeModal = closeModalFn
}


export {}
