declare global{
  interface HTMLElementTagNameMap {
    'uno-tab': UnoTab;
    'uno-tab-tabs': HTMLElement;
    'uno-tab-tab': HTMLElement;
    'uno-tab-ctns': HTMLElement;
    'uno-tab-ctn': HTMLElement;
  }
}

export default class UnoTab extends HTMLElement {
  constructor() {
    super();
  }

  get tabs() {
    return this.querySelectorAll<HTMLElement>(':scope>uno-tab-tabs>uno-tab-tab');
  }

  get ctns() {
    return this.querySelectorAll<HTMLElement>(':scope>uno-tab-ctns>uno-tab-ctn');
  }

  get activeTab() {
    return this.querySelector<HTMLElement>(':scope>uno-tab-tabs>uno-tab-tab[active]')!;
  }

  get activeCtn() {
    return this.querySelector<HTMLElement>(':scope>uno-tab-ctns>uno-tab-ctn[active]')!;
  }

  get defaultTab() { return parseInt(this.getAttribute('default') || '0') }

  _updateBarBound = this.updateBar.bind(this);

  connectedCallback() {
    //calling update in next tick to allow children to be added
    setTimeout(this.update.bind(this));
    window.addEventListener('resize', this._updateBarBound);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._updateBarBound);
  }

  update() {
    //check if tabs and ctns length match and if there are any tabs
    if (this.tabs.length != this.ctns.length) throw new Error('uno-tab: tabs and ctns length mismatch');
    if (this.tabs.length == 0) throw new Error('uno-tab: no tabs found');

    //remove active duplicates
    this.querySelectorAll(':scope>uno-tab-tabs>uno-tab-tab[active]~uno-tab-tab[active],:scope>uno-tab-ctns>uno-tab-ctn[active]~uno-tab-ctn[active]')
      .forEach(tab => tab.removeAttribute('active'));

    //set first tab active if none is active
    if (!this.activeTab) this.tabs[this.defaultTab].setAttribute('active', '');
    if (!this.activeCtn) this.ctns[this.defaultTab].setAttribute('active', '');
    this.updateBar();

    //set tab click event
    this.addEventListener('click', e => {
      if (!(e.target instanceof HTMLElement)) return;
      const realTarget = e.target.closest<HTMLElement>('uno-tab>uno-tab-tabs>uno-tab-tab');
      if (realTarget) {
        this.activeTab.removeAttribute('active');
        this.activeCtn.removeAttribute('active');
        realTarget.setAttribute('active', '');
        const ctnTarget = this.ctns[Array.from(this.tabs).indexOf(realTarget)]
        ctnTarget.setAttribute('active', '');
        this.updateBar();
        if (this.hasAttribute("auto-scroll")) {
          const scrollTarget = window.scrollY + ctnTarget.getBoundingClientRect().top - window.innerHeight / 6;
          window.scrollTo({top: scrollTarget, behavior: 'smooth'});
        }
      }
    });
  }

  updateBar() {
    let pos: number, size: number;
    if (this.hasAttribute("vertical")) {
      pos = this.activeTab.offsetTop;
      size = this.activeTab.offsetHeight;
    } else {
      pos = this.activeTab.offsetLeft;
      size = this.activeTab.offsetWidth;
    }
    this.activeTab.parentElement?.style.setProperty('--bar-pos', pos + 'px');
    this.activeTab.parentElement?.style.setProperty('--bar-size', size + 'px');
  }
}