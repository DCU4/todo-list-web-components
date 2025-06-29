// todo-list.js
// ─────────────
// <todo-item>  – a single task, uses a default slot for its label
// <todo-list>  – container with built-in “add” form; accepts slotted <todo-item>s

function getTemplateContent(id) {
  const tmpl = document.getElementById(id);
  if (!tmpl) throw new Error(`Template "${id}" not found`);
  return tmpl.content.cloneNode(true);
}

class TodoItem extends HTMLElement {
  static get observedAttributes() { return ['done']; }

  constructor() {
    super();
    this.attachShadow({mode:'open'}).append(getTemplateContent('itemTmpl'));
  }
  connectedCallback() {
    this._chk   = this.shadowRoot.querySelector('input[type="checkbox"]');
    this._del   = this.shadowRoot.querySelector('.remove');
    this._chk.checked = this.hasAttribute('done');

    this._chk.addEventListener('change', () => {
      this.toggleAttribute('done', this._chk.checked);
      this.dispatchEvent(new CustomEvent('todo-toggle', {bubbles:true}));
    });
    this._del.addEventListener('click', () => {
      this.remove();
      this.dispatchEvent(new CustomEvent('todo-remove', {bubbles:true}));
    });
  }
  attributeChangedCallback(name, _, val) {
    if (name==='done' && this._chk) this._chk.checked = this.hasAttribute('done');
  }
}
customElements.define('todo-item', TodoItem);


// ──────────────────────────────────────────────────
// <todo-list> element
// ──────────────────────────────────────────────────

class TodoList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'}).append(getTemplateContent('listTmpl'));
  }
  connectedCallback() {
    // fetch initial data from API
    fetchTodos().then(data => {
      console.log(data.notes)
      data.notes.note.split('\n').forEach(item => {
        const todoItem = document.createElement('todo-item');
        todoItem.textContent = item;
        if (item.done) todoItem.setAttribute('done', '');
        this.appendChild(todoItem);
      });
      this._emitSummary();
    }).catch(err => {
      console.error('Failed to fetch todos:', err);
    });


    // handle built-in add form (if not overridden)
    const form = this.shadowRoot.querySelector('#add-form');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input');
      this.addItem(input.value);
      input.value = '';
      input.focus();
    });

    // delegate events from <todo-item>
    this.addEventListener('todo-remove', () => this._emitSummary());
    this.addEventListener('todo-toggle', () => this._emitSummary());
  }

  /** Programmatic API */
  // addItem(label) {
  //   const item = document.createElement('todo-item');
  //   item.textContent = label;
  //   this.appendChild(item);
  //   this._emitSummary();
  //   return item;
  // }
  addItem(label) {
    if (!label) return;
    postTodo(label).then(data => {
      const item = document.createElement('todo-item');
      item.textContent = data.note;
      if (data.done) item.setAttribute('done', '');
      this.appendChild(item);
      this._emitSummary();
    }).catch(err => {
      console.error('Failed to post todo:', err);
    });
  }
  _emitSummary() {
    const all  = [...this.querySelectorAll('todo-item')];
    const done = all.filter(t => t.hasAttribute('done')).length;
    this.dispatchEvent(new CustomEvent('todo-summary', {
      detail:{ total:all.length, done },
      bubbles:true
    }));
  }
}
customElements.define('todo-list', TodoList);


// init
window.addEventListener('DOMContentLoaded', () => {
  // const todoList = document.getElementById('tasks');
  // if (todoList) {
  //   todoList.addItem('Buy groceries');
  //   todoList.addItem('Walk the dog');
  //   todoList.addItem('Read a book');
  // }
  document.getElementById('tasks').addEventListener('todo-summary', e => {
    console.log('Personal list:', e.detail);
  });
});


// function to get and post to this url
async function fetchTodos() {
  const response = await fetch('https://notes-api-five.vercel.app/685a0963e9b0630007bd0c84');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
}

// function to post a new todo item
async function postTodo(item, done = false) {

  if(done) {
    item = item + ' (done)';
  }

  
  const response = await fetch('https://notes-api-five.vercel.app/685a0963e9b0630007bd0c84/?_method=PUT', {
      method: "POST",
      body: "note="+item,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
}