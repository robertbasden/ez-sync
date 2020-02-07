// https://developer.chrome.com/extensions/bookmarks

// Synching

const manualSyncButton = document.getElementById('manualSyncButton')
const removeAllButton = document.getElementById('removeAllButton')
const newSyncFolderSelect = document.getElementById('newSyncFolderSelect')
const newSyncUrl = document.getElementById('newSyncUrl')
const addNewSync = document.getElementById('addNewSync')

const currentSyncSettings = document.getElementById('currentSyncSettings')

let listsToSync = []

const removeSync = (uuidToRemove) => {
    let newListsToSync = listsToSync.slice(0)
  listsToSync = newListsToSync.filter(({uuid}) => uuid !== uuidToRemove)
  saveCurrentSyncs()
  renderListsToSync()
}

const renderListsToSync = () => {
  const node = document.querySelectorAll('#currentSyncSettings tbody')[0]
  node.innerHTML = ''
  const elements = listsToSync.map(({uuid, id, url}) => {
    const tr = document.createElement('tr')
    const removeButton = document.createElement('button')
    removeButton.innerHTML = 'Remove'
    removeButton.addEventListener('click', () => {
      removeSync(uuid)
    })
    const contents = `<td></td><td>${url}</td><td></td>`
    tr.innerHTML = contents
    chrome.bookmarks.get(id, (bookmark) => {
      tr.querySelectorAll('td:first-child')[0].innerHTML = bookmark[0].title
      tr.querySelectorAll('td:last-child')[0].appendChild(removeButton)
    })
    return tr
  })
  for(var i = 0; i < elements.length; i++) {
    node.appendChild(elements[i]);
  }
}

chrome.storage.sync.get('listsToSync', function(data) {
  listsToSync = data.listsToSync ? data.listsToSync.slice(0) : []
  renderListsToSync()
})

const saveCurrentSyncs = () => {
  chrome.storage.sync.set({ listsToSync: listsToSync })
}

const addNewSyncFn = () => {
  const id = newSyncFolderSelect.value
  const url = newSyncUrl.value
  newSyncUrl.value = ''
  listsToSync.push({ uuid: new Date().getTime(), id, url })
  saveCurrentSyncs()
  renderListsToSync()
}

addNewSync.addEventListener('click', addNewSyncFn)

const syncronizeBookmarks = () => {

  const removeChildren = (id) => {
    chrome.bookmarks.getChildren(id, (children) => {
      children.forEach(({ id }) => {
        chrome.bookmarks.remove(id)
      })
    })
  }

  listsToSync.forEach(({ id, url }) => {
    let folderId = id
    fetch(url)
      .then((response) => {
        return response.json()
      })
      .then((myJson) => {
        removeChildren(folderId) // Race condition? Removing doesn't finish before creating begins? Probably doesn't mater
        const bookmarksToCreate = myJson.map(({title, url}) => {
          return { title, url, parentId: folderId }
        })
        bookmarksToCreate.forEach((newBookmark) => {
          chrome.bookmarks.create(newBookmark)
        })
      })
  })
}

manualSyncButton.addEventListener('click', syncronizeBookmarks)

const removeAll = () => {
  listsToSync = []
  saveCurrentSyncs()
  renderListsToSync()
}

removeAllButton.addEventListener('click', removeAll)

// Exporting

const exportFolderSelect = document.getElementById('exportFolderSelect')
const editorTextArea = document.getElementById('editorTextArea')
const editor = CodeMirror.fromTextArea(editorTextArea, {
  lineNumbers: true,
  mode: 'application/json'
})

const showNodeContents = (id) => {
  chrome.bookmarks.getChildren(id, (contents) => {
    const relevantContents = contents.map(({title, url}) => {
      return {title, url}
    })
    editor.setValue(JSON.stringify(relevantContents, null, 1))
  })
}

exportFolderSelect.addEventListener('change', function(e) {
  const nodeId = e.srcElement.value
  showNodeContents(nodeId)
})

// Init

chrome.bookmarks.getTree((bookMarkTree) => {
  const elements = bookMarkTree[0].children[0].children
    .filter((item) => {
      return item.hasOwnProperty('children')
    })
    .map((item) => {
      const option = document.createElement('option')
      option.text = item.title
      option.value = item.id
      return option
    })
  for(var i = 0; i < elements.length; i++) {
    exportFolderSelect.appendChild(elements[i]);
    newSyncFolderSelect.appendChild(elements[i].cloneNode(true))
  }
})
