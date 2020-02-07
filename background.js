const alarmName = "syncBookmarks"

const handleAlarm = (alarm) => {

  if (alarm.name === "alarmName") {
    chrome.storage.sync.get('listsToSync', function(data) {
      listsToSync = data.listsToSync ? data.listsToSync.slice(0) : []

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

    })
  }
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.alarms.create("alarmName", {
    delayInMinutes: 1,
    periodInMinutes: 1
  })
  chrome.alarms.onAlarm.addListener(handleAlarm)
})