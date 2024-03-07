// ==UserScript==
// @name         Chat GPT Helper
// @namespace    http://tampermonkey.net/
// @version      2024-03-05
// @description  Enhances interaction with ChatGPT by adding features for saving and hiding chat entries.
// @author       Marc Davis
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @include      https://chat.openai.com/c/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    var sessionList = []; // Array to store saved chat entries
    var sessionIconsAdded = []; // Tracks chat entries with added save icons
    var sessionLinks = []; // Links UI section elements to sessionList elements
    var categories = []; // Array to categorize saved chat entries
    var categoryLinks = []; // Links category UI elements to their data
    var mainLoopStarted = false; // Indicates if main monitoring loop is active
    var saveWarnedUser = false; // Ensures user is warned once per session about saving
    var visualIconAdded = false; // Indicates if save entries visual icon is added
    var lastUrl = window.location.href; // Stores current window location URL
    var activeDropDownToolTip = false; // Tracks visibility state of dropdown tooltip
    var activeCategory = "General"; // Currently active/selected category
    var activeOverlay = false; // Manages presence of an active overlay (e.g., modal window)

    console.log("Entire page fully loaded, parsing page in 5 seconds."); // Log statement

    // Start the main loop to deploy icons periodically
    function mainLoop() {
        setInterval(function() {
            deployIcons();
            buttonizeIcons();
        }, 5000); // Set interval to 5 seconds
    }
    mainLoop();

    // Function to hide a chat entry from view
    function hideEntry(el) {
        el.style.display = "none"; // CSS to make the element invisible
    }

    // Function to show a hidden chat entry, unused but ready for future implementation
    function showEntry(el) {
        el.style.display = "inline"; // CSS to make the element visible inline
    }

    // Saves a chat entry to a list for later access
    function saveEntryToList(el) {
        if(sessionList.indexOf(el) >= 0) {
            alert("Entry already added to list, category: " + getCategoryByElement(el)); // Prevent duplicate entries
        } else {
            if (!saveWarnedUser) {
                saveWarnedUser = true; // Ensure the warning is only shown once
                alert("Saved entry under category: " + activeCategory + ". To view, click the Notebook, in the bottom left-hand corner. This message only shows once per session.");
            }
            categoryLinks.push({
                main:el,
                category:activeCategory
            });
            sessionList.push(el); // Add the entry to the list
        }
    }

    // Returns the category associated with a given element from categoryLinks.
    function getCategoryByElement(element) {
        var items = categoryLinks; // Holds links between categories and their UI elements
        for (const item of items) {
            if (item.main === element) {
                return item.category; // If element matches, return its associated category
            }
        }
        return false; // If no matching element found, return false
    }

    // Returns an array of elements that belong to a specific category from categoryLinks.
    function getElementsByCategory(category) {
        var items = categoryLinks; // Access category links to find elements by category
        const mains = []; // Array to hold elements belonging to the specified category
        for (const item of items) {
            if (item.category === category) {
                mains.push(item.main); // Add matching elements to the mains array
            }
        }
        return mains; // Returns array of elements, can be empty if no matches found
    }

    // Removes a link associated with a specific element from categoryLinks.
    function removeCategoryLink(element) {
        var items = categoryLinks; // Access category links to identify elements to remove
        var removed = false; // Tracks if any link was removed
        var toremove = []; // Temporary array to hold elements that will be removed
        var link = getSessionLink(element);
        items.forEach(function(item) {
            if (item.main === link) {
                toremove.push(item); // Identify and add elements to be removed
            }
        });

        toremove.forEach(function(el) {
            categoryLinks = filterArrayByValue(categoryLinks, el); // Remove identified elements from categoryLinks
            removed = true; // Update removed flag if elements are removed
        });
        return removed; // Return the status of the removal operation
    }

    // Deploys save and hide icons next to eligible chat entries
    function deployIcons() {
        var query = document.querySelectorAll(".text-gray-400.flex.self-end"); // Query to find elements to add icons
        query.forEach(function(el) {
            //el.style.backgroundColor = "red"; // Highlighting background for visual feedback
            if(sessionIconsAdded.indexOf(el) < 0) { // Check if icons have not been added
                var saveIcon = createImageIcon("https://cdn1.iconfinder.com/data/icons/medicato/32/cross_round-256.png", 1);
                var hideIcon = createImageIcon("https://icon-library.com/images/hide-icon/hide-icon-13.jpg", 3);
                el.appendChild(saveIcon); // Append save icon
                el.appendChild(hideIcon); // Append hide icon
                sessionIconsAdded.push(el); // Mark as icons added
            }
        });

        // Add a visual icon for accessing saved entries if not already added
        if(!visualIconAdded || lastUrl != window.location.href) {
            lastUrl = window.location.href;
            visualIconAdded = true;
            var query2 = document.querySelector(".stretch.mx-2.flex.flex-row.gap-3"); // Find a suitable place to add the icon
            var viewIcon = createImageIcon("https://cdn0.iconfinder.com/data/icons/healthcare-science-and-government/64/notepad-paper-notebook-education-diary-256.png", 2);
            query2.parentNode.appendChild(viewIcon); // Add the view icon to the page
        }
    }

    // Creates an image element to be used as an interactive icon
    function createImageIcon(imageUrl, functionTypeAsInteger) {
        const image = document.createElement('img');
        Object.assign(image, {
            src: imageUrl,
            style: `width: 25px; height: 25px; object-fit: cover; border-radius: 10%; cursor: pointer;`
        });

        // Add event listener based on the function type
        // Type 1: Save entry icon
        if(functionTypeAsInteger === 1) {
            image.title = "Save this section under the specified category";
            image.addEventListener('mouseenter', function(event) {
                createHoverCategoryMenu(image);
            });
            image.addEventListener('click', function() {
                var associatedContext = this.parentNode.parentNode.parentNode;
                saveEntryToList(associatedContext); // Save the entry on click
                closeActiveDropDownToolTip();
            }, false);
        }
        // Type 2: View saved entries icon
        else if(functionTypeAsInteger === 2) {
            image.style.width = "60px";
            image.style.height = "60px";
            image.style.backgroundColor = 'rgba(0,0,0,0)';
            image.setAttribute("title","Show & manage your saved sections");
            image.addEventListener('click', function() {
                closeActiveDropDownToolTip();
                createOverlayDiv(); // Show saved entries on click
            }, false);
        }
        // Type 3: Hide entry icon
        else if(functionTypeAsInteger === 3) {
            image.title = "Hide this section from view (collapse)";
            image.addEventListener('click', function() {
                var associatedContext = this.parentNode.parentNode.parentNode;
                hideEntry(associatedContext); // Hide the entry on click
                closeActiveDropDownToolTip();
            }, false);
        }

        return image; // Return the newly created icon
    }

    //Toggles an element's size between its original dimensions and 100% height and width on click events.
    function toggleElementSize(element) {
        // Check if the original size has been stored; if not, store it
        if (!element.hasAttribute('data-original-width') || !element.hasAttribute('data-original-height')) {
            element.setAttribute('data-original-width', element.style.width);
            element.setAttribute('data-original-height', element.style.height);
            element.setAttribute('data-original-mleft', element.style.marginLeft);
        }

        // Define the toggle function
        const toggleSize = () => {
            // Check the current size; if it's not at 100%, set it to 100%
            if (element.style.width !== '100%' && element.style.height !== '100%') {
                element.style.width = '100%';
                element.style.height = '100%';
                element.style.marginLeft = "0px";
            } else {
                // Otherwise, revert to the original size
                element.style.width = element.getAttribute('data-original-width');
                element.style.height = element.getAttribute('data-original-height');
                element.style.marginLeft = element.getAttribute('data-original-mleft');
            }
        };

        // Register the toggle function as an onclick event handler
        element.onclick = toggleSize;
    }

    // Returns modified array without value provided
    function filterArrayByValue(arr, value) {
        var na = []; // Initialize a new array to hold filtered elements
        arr.forEach(function(el) {
            if (el == value) return; // Skip the element if it matches the value to be filtered out
            na.push(el); // Add element to new array if it doesn't match the value
        });
        return na; // Return the newly created array without the specified value
    }

    // Gets the linked element for the session
    function getSessionLink(element) {
        var linkreturned = false;
        sessionLinks.forEach(function(link) {
            var linkedElement = link.main;
            if(linkedElement == element) {
                linkreturned = link.link;
                return;
            }
        });
        return linkreturned;
    }

    // Remove the link data from the main chat section to the workbook section
    function removeSessionLink(element) {
        var linkreturned = false;
        sessionLinks.forEach(function(link) {
            var linkedElement = link.main;
            if(linkedElement == element) {
                linkreturned = link;
                return;
            }
        });
        if(linkreturned != false) {
            sessionLinks = filterArrayByValue(sessionLinks, linkreturned);
        }
        return linkreturned;
    }

    // Turns the chat icons into clickable buttons that restore hidden chat sections
    function buttonizeIcons() {
        // Select chat icons based on specific class names
        var icons = document.querySelectorAll(".flex-shrink-0.flex.flex-col.relative.items-end");

        icons.forEach(function(el) {
            if (el.style.cursor != "pointer") { // Make icons clickable if not already
                el.style.cursor = "pointer"; // Indicate clickable items
                el.title = "Click to restore the hidden section"; // Tooltip for functionality
                addClickListener(el, function() { // Add click listener to reveal hidden chat sections
                    var restore = el.parentNode.querySelector(".relative.flex.w-full.flex-col.agent-turn"); // Find parent chat section
                    restore = restore.querySelector(".flex-col.gap-1"); // Narrow down to specific hidden part
                    restore.style.display = "inline"; // Make the hidden part visible
                });
            }
        });
    }

    // Adds a left-click listener to element provided and runs action (anon function)
    function addClickListener(el, action) {
        // Get the element by its ID
        const element = el;

        // Check if the element exists to avoid errors
        if (element) {
            // Attach a click event listener to the element
            element.addEventListener('click', function(event) {
                // Execute the specified action
                action();
            });
        } else {
            console.error('Element with id ' + element + ' not found.');
        }
    }

    // Basic right click menu popup, used when removing sections in the category manager
    function attachRightClickMenu(element) {
        element.addEventListener('contextmenu', function(e) {
            e.preventDefault(); // Prevent the default context menu

            // Remove any existing custom context menus
            const existingMenu = document.querySelector('.custom-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            // Create the context menu container
            const menu = document.createElement('div');
            Object.assign(menu, {
                className: 'custom-context-menu',
                style: `z-index:1005;position: fixed; left: ${e.pageX}px; top: ${e.pageY}px; background-color: #fff; border: 1px solid #ddd; padding: 10px; box-shadow: 2px 2px 6px rgba(0,0,0,0.2); zIndex: 1005;`
            });

            // Add text message
            const message = document.createElement('p');
            message.textContent = 'Remove Selection?';
            message.style.color = '#333'; // Dark text color for contrast
            message.style.marginBottom = '15px'; // Space between message and buttons
            menu.appendChild(message);

            // Create container for buttons to allow for even spacing
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.justifyContent = 'space-around'; // Evenly space out buttons

            // Create Yes button
            const yesButton = document.createElement('button');
            Object.assign(yesButton, {
                textContent: 'Yes',
                style: `background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;`
            });

            yesButton.onclick = function() {
                var link = getSessionLink(element);
                if(!link) {
                    alert("no link found for element: " + element);
                }
                sessionList = filterArrayByValue(sessionList, link);
                // need to remove obj from session links as well
                removeCategoryLink(element);
                removeSessionLink(element);
                element.remove();
                menu.remove(); // Remove the context menu
            };
            buttonsContainer.appendChild(yesButton);

            // Create No button
            const noButton = document.createElement('button');
            Object.assign(noButton, {
                textContent: 'No',
                style: `background-color: #F44336; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;`
            });
            noButton.onclick = function() {
                menu.remove(); // Remove the context menu
            };
            buttonsContainer.appendChild(noButton);

            // Add the buttons container to the menu
            menu.appendChild(buttonsContainer);

            // Add the menu to the document
            document.body.appendChild(menu);
        });
    }

    // Creates input box menu for when creating a new category
    function createInputBoxMenu(text) {
        // Create elements
        const menu = document.createElement('div');
        const description = document.createElement('p');
        const subdescription = document.createElement('p');
        const inputBox = document.createElement('input');
        const cancelButton = document.createElement('button');

        // Setup menu
        Object.assign(menu.style, {
            position: 'fixed', // Use fixed positioning to place it relative to the viewport
            top: '50%', // Position the top edge of the element in the middle of the screen vertically
            left: '50%', // Position the left edge of the element in the middle of the screen horizontally
            transform: 'translate(-50%, -50%)', // Adjust the element's position to truly center it
            zIndex: '1010', // Ensure the element is on top of others
            padding:"20px"
        });
        menu.style.position = "absolute";
        menu.style.background = "rgba(80,80,80,0.8)"

        document.body.appendChild(menu);

        // Setup description
        description.textContent = text;
        description.style.textAlign = "center";
        menu.appendChild(description);

        // Setup subdescription
        subdescription.textContent = "Press enter to submit";
        subdescription.style.fontSize = "10px";
        subdescription.style.textAlign = "center";
        menu.appendChild(subdescription);

        // Setup inputBox
        inputBox.type = 'text';
        inputBox.style.marginTop = '10px';
        inputBox.style.color = "gray";
        menu.appendChild(inputBox);

        // Setup cancelButton
        Object.assign(cancelButton.style, {backgroundColor: 'red', color: 'white', display: 'block', margin: '10px auto', padding: '5px 10px', border: 'none', cursor: 'pointer'});
        cancelButton.textContent = 'Cancel';
        menu.appendChild(cancelButton);

        // Event listeners
        inputBox.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                console.log('Input submitted:', inputBox.value);
                var category = inputBox.value;
                categories.push(category);
                console.log("Saved category: " + category);
                menu.remove();
                overlayDivRefresh();
            }
        });
        cancelButton.addEventListener('click', () => {
            console.log('Cancellation requested');
            menu.remove();
        });
    }

    // Created the drop down menu for the categories on the main page
    function createCategoriesManager() {
        // Create drop down section "container"
        const container = Object.assign(document.createElement('div'), {
            style: `display: flex; justify-content: center; align-items: center; gap: 20px; padding: 40px;`
        });

        // Create and style dropdown
        var generalSelected = "";
        if(activeCategory == "General") {
            generalSelected = `selected="selected" `
        }
        const dropdown = Object.assign(document.createElement('select'), {
            innerHTML: `<option ` + generalSelected + `value="General">General</option>`,
            style: "padding: 5px 10px;width:140px;color:gray;",
            color: "gray"
        });
        dropdown.title = "Active Category";
        categories.forEach(function(cat) {
            var selected = "";
            if(activeCategory == cat) {
                selected = `selected="selected" `
            }
            dropdown.innerHTML += `<option ` + selected + `value="` + cat + `">` + cat + `</option>`;
        });

        dropdown.onchange = function() {
            updateActiveCategory(dropdown.value);
            overlayDivRefresh();
        }

        // Function to create and style buttons
        const createButton = (text, bgColor) => Object.assign(document.createElement('button'), {
            textContent: text,
            style: `padding: 5px 15px; color: white; background: ` + bgColor + `; border: none; cursor: pointer;`
        });

        // Create + and - buttons
        const addButton = createButton('+', 'rgba(46, 204, 113, 1)');

        // Add an event listener for the '+' button click
        addButton.title = "Create new Category";
        addButton.addEventListener('click', () => {
            // Code to execute when '+' button is clicked
            console.log('The "+" button was clicked');
            createInputBoxMenu("Add new category");
        });

        const subtractButton = createButton('-', 'rgba(231, 76, 60, 1)');

        // Append elements to container and container to body
        subtractButton.title = "Remove active Category";
        container.append(dropdown, addButton, subtractButton);
        //document.body.append(container);

        // Style the body for centering
        Object.assign(document.body.style, {
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', margin: '0'
        });

        return container;
    }

    // Sets the active category to save sections to
    function updateActiveCategory(categoryNow) {
        activeCategory = categoryNow;
    }

    // Close active drop down tool tip
    function closeActiveDropDownToolTip() {
        if(activeDropDownToolTip != false) {
            activeDropDownToolTip.remove();
            activeDropDownToolTip = false;
        }
    }

    // Create the hover category menu
    function createHoverCategoryMenu(targetElement) {
        // Create tooltip container
        if(activeDropDownToolTip != false) {
            activeDropDownToolTip.remove();
        }

        const tooltip = Object.assign(document.createElement('div'), {
            style: `position: absolute;z-index:1001; color: gray; text-align: center; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;` // initially hidden
        });

        activeDropDownToolTip = tooltip;

        // Main text
        tooltip.appendChild(Object.assign(document.createElement('div'), {
            textContent: 'Active Category',
            style: 'font-size: 14px; margin-bottom: 5px;font-weight:bold;'
        }));

        // Categories label
        tooltip.appendChild(Object.assign(document.createElement('div'), {
            textContent: 'Categories',
            style: 'font-size: 12px; margin-bottom: 5px;'
        }));

        // Dropdown box
        var generalSelected = "";
        if(activeCategory == "General") {
            generalSelected = 'selected="selected" '
        }
        var tooltipSelect = Object.assign(document.createElement('select'), {
            innerHTML: '<option ' + generalSelected +'value="General">General</option>',
            style: 'margin: auto; display: block;'
        });

        tooltip.appendChild(tooltipSelect);

        categories.forEach(function(cat) {
            var selected = "";
            if(activeCategory == cat) {
                selected = `selected="selected" `
            }
            tooltipSelect.innerHTML += `<option ` + selected + `value="` + cat + `">` + cat + `</option>`;
        });

        tooltipSelect.onchange = function() {
            updateActiveCategory(tooltipSelect.value);
        }

        // Append tooltip to body
        document.body.appendChild(tooltip);

        // Function to show tooltip at cursor position
        const showTooltip = (e) => {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 10}px`; // Offset a bit from cursor
            tooltip.style.top = `${e.clientY + 10}px`;
        };

        // Function to hide tooltip
        const hideTooltip = () => {
            //tooltip.style.display = 'none';
            tooltip.remove();
        };

        // Event listeners for mouse enter/leave
        targetElement.addEventListener('mousemove', showTooltip);
        tooltip.addEventListener('mouseleave', hideTooltip);
    }

    // Refresh the overlay div
    function overlayDivRefresh() {
        activeOverlay.remove();
        createOverlayDiv();
    }

    // Creates a semi-transparent overlay to display saved entries
    function createOverlayDiv() {
        // Create an overlay div and set styles to cover the entire viewport with specific properties
        const overlayDiv = document.createElement('div');
        activeOverlay = overlayDiv; // Assign created div to activeOverlay.

        // Apply styles using Object.assign for conciseness
        Object.assign(overlayDiv.style, {
            position: 'fixed', // Fixed position to cover the viewport
            top: '0', // Start from the top edge
            left: '0', // Start from the left edge
            width: '100%', // Span the full width of the viewport
            height: '100%', // Span the full height of the viewport
            backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black background
            zIndex: '1000', // Ensure overlay is above other content
            overflowY: 'scroll', // Enable vertical scrolling
        });

        // Create the close button and apply styles and functionality using Object.assign
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Close'; // Set button text
        Object.assign(closeButton.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: '1001', // Ensure button is above the overlay
            color: 'red',
            fontWeight: 'bold'
        });
        // Attach click event listener to remove the overlay when button is clicked
        closeButton.addEventListener('click', () => {
            overlayDiv.remove();
        });
        overlayDiv.appendChild(closeButton); // Add close button to overlay

        var container = createCategoriesManager();
        overlayDiv.append(container);


        // Add paragraphs for each saved entry
        sessionList.forEach(function(el) {
            var cat = getCategoryByElement(el);
            if(cat == false || cat != activeCategory) {
                return;
            }

            var paragraph = document.createElement('p');
            paragraph.innerHTML = el.innerHTML;
            var remove = paragraph.querySelector(".mt-1.flex.justify-start.gap-3");
            remove.remove();
            // Style paragraph to make it distinguishable
            Object.assign(paragraph.style, {
                backgroundColor: 'rgba(200,200,200,0.8)',
                marginBottom: "20px",
                border: "medium solid white",
                height: "300px",
                overflowY: "scroll",
                padding: "80px",
                width: "60%",
                marginLeft: "20%"
            });
            attachRightClickMenu(paragraph);
            toggleElementSize(paragraph);
            overlayDiv.appendChild(paragraph); // Add paragraph to overlay
            var link = {"main":paragraph,"link":el};
            sessionLinks.push(link);
        });

        document.body.appendChild(overlayDiv); // Add overlay to document body
    }
})();
