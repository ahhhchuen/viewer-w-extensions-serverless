export class BaseExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
        this._onSelectionChanged = (ev) => this.onSelectionChanged(ev.model, ev.dbIdArray);
        this._onIsolationChanged = (ev) => this.onIsolationChanged(ev.model, ev.nodeIdArray);
        this.cachedDbIds = null;
        this.geometryNames = ['mesh', 'body'];
    }

    load() {
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }

    unload() {
        this.viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
        this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this._onSelectionChanged);
        this.viewer.removeEventListener(Autodesk.Viewing.ISOLATE_EVENT, this._onIsolationChanged);
        return true;
    }

    onModelLoaded(model) {}

    onSelectionChanged(model, dbids) {}

    onIsolationChanged(model, dbids) {}    
    

    findLeafNodes(model) {
        return new Promise(function (resolve, reject) {
            model.getObjectTree(function (tree) {
                let leaves = [];
                tree.enumNodeChildren(tree.getRootId(), function (dbid) {
                    if (tree.getChildCount(dbid) === 0 ) {
                        leaves.push(dbid);
                    }
                }, true /* recursively enumerate children's children as well */);
                // console.log(leaves);
                resolve(leaves);
            }, reject);
        });
    }


    /*   1st AI suggested solution 
    findFilteredLeafNodes(viewer) {
        return new Promise(async (resolve, reject) => {
            try {
                const dbIds = [];
                const leafDbIds = [];
    
                // Function to recursively traverse the model hierarchy
                async function traverse(node) {
                    try {
                        // Get children of the current node
                        const children = await new Promise((resolve, reject) => {
                            viewer.getObjectTree(
                                (tree) => {
                                    const children = [];
                                    tree.enumNodeChildren(node.dbId, (childId) => {
                                        children.push({ dbId: childId, parentId: node.dbId });
                                    });
                                    resolve(children);
                                },
                                (err) => reject(err)
                            );
                        });
    
                        if (children.length === 0) {
                            // This is a leaf node
                            leafDbIds.push(node);
                        } else {
                            // Traverse children
                            for (const child of children) {
                                await traverse(child);
                            }
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
    
                // Get the object tree
                const tree = await new Promise((resolve, reject) => {
                    viewer.getObjectTree(
                        (tree) => resolve(tree),
                        (err) => reject(err)
                    );
                });
    
                // Start traversal from the root node
                const rootNode = { dbId: tree.getRootId(), parentId: null };
                await traverse(rootNode);
    
                // Extract dbIds of leaf nodes
                const leafIds = leafDbIds.map((node) => node.dbId);
    
                // Get properties for all leaf nodes in bulk
                const properties = await new Promise((resolve, reject) => {
                    viewer.model.getBulkProperties(leafIds, {}, (props) => resolve(props), (err) => reject(err));
                });
    
                // Process properties and filter based on name
                properties.forEach((prop, index) => {
                    const name = prop ? prop.name : null;
                    const node = leafDbIds[index];
    
                    if (name && (name.toLowerCase() === "mesh" || name.toLowerCase() === "body")) {
                        // Use the immediate parent's dbId
                        dbIds.push(node.parentId);
                    } else {
                        // Use the leaf's dbId
                        dbIds.push(node.dbId);
                    }
                });
    
                resolve(dbIds);
            } catch (error) {
                reject(error);
            }
        });
    }
    */

    findActualLeafNodes(model, useCache = true, useParallel = true) {
        return new Promise(async (resolve, reject) => {
            try {
                // let viewer; // get the viewer by inputing either viewer or model
                // if (input && input.getState) {
                //     viewer = input;
                //     console.log('its an viewer!');
                // } else {
                //     viewer.switchToModel(input); // Make this model active
                //     viewer = input.viewer;
                //     console.log('its an model!');
                // }

                // Approach: Use cached results if available and caching is enabled
                if (useCache && this.cachedDbIds) {
                    resolve(this.cachedDbIds);
                    return;
                }
    
                let dbIds = [];
                
                const allDbIds = await this.findLeafNodes(model);

                // Approach: Use Bulk Properties with Parallel Processing
                if (useParallel) {
                    const chunkSize = 1000; // Adjust chunk size as needed
                    const chunks = [];
                    for (let i = 0; i < allDbIds.length; i += chunkSize) {
                        chunks.push(allDbIds.slice(i, i + chunkSize));
                    }

                    const results = await Promise.all(
                        chunks.map((chunk) => {
                            return new Promise((resolve, reject) => {
                                model.getBulkProperties(chunk, {}, (props) => resolve(props), (err) => reject(err));
                            });
                        })
                    );

                    // Flatten and filter results
                    results.flat().forEach((prop) => {
                        const hasGeometryProperty = prop.properties.some(property => {
                            const displayValue = property.displayValue?.toString().toLowerCase();
                            return this.geometryNames.includes(displayValue);
                        });
                        const name = prop ? prop.name : null;
                        if (hasGeometryProperty || (name && this.geometryNames.includes(name.toLowerCase()))) {
                            const displayProperty = prop.properties.find(
                                (subProp) => subProp.displayName === "parent"
                            );
                            if (displayProperty.displayValue) {
                                dbIds.push(displayProperty.displayValue);
                            } else {
                            dbIds.push(prop.dbId);
                            }
                        } else {
                            dbIds.push(prop.dbId);
                        }
                    });
                } else {
                    // Approach: Use Bulk Properties without Parallel Processing
                    const properties = await new Promise((resolve, reject) => {
                        model.getBulkProperties(allDbIds, {}, (props) => resolve(props), (err) => reject(err));
                    });

                    properties.forEach((prop) => {
                        const hasGeometryProperty = prop.properties.some(property => {
                            const displayValue = property.displayValue?.toString().toLowerCase();
                            return this.geometryNames.includes(displayValue);
                        });
                        const name = prop ? prop.name : null;
                        if (hasGeometryProperty || (name && this.geometryNames.includes(name.toLowerCase()))) {
                            const displayProperty = prop.properties.find(
                                (subProp) => subProp.displayName === "parent"
                            );
                            if (displayProperty.displayValue) {
                                dbIds.push(displayProperty.displayValue);
                            } else {
                            dbIds.push(prop.dbId);
                            }
                        } else {
                            dbIds.push(prop.dbId);
                        }
                    });
                }
                
                // remove duplicate elements
                dbIds = [...new Set(dbIds)];
    
                // Cache the results for future use
                if (useCache) {
                    this.cachedDbIds = dbIds;
                }
                // console.log(dbIds);    
                resolve(dbIds);
            } catch (error) {
                reject(error);
            }
        });
    }

    async findPropertyNames(model) {
        const dbids = await this.findLeafNodes(model);
        return new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, {}, function (results) {
                let propNames = new Set();
                for (const result of results) {
                    for (const prop of result.properties) {
                        propNames.add(prop.displayName);
                    }
                }
                resolve(Array.from(propNames.values()));
            }, reject);
        });
    }


    createToolbarButton(buttonId, buttonIconUrl, buttonTooltip) {
        let group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('dashboard-toolbar-group');
            this.viewer.toolbar.addControl(group);
        }
        const button = new Autodesk.Viewing.UI.Button(buttonId);
        button.setToolTip(buttonTooltip);
        group.addControl(button);
        const icon = button.container.querySelector('.adsk-button-icon');
        if (icon) {
            icon.style.backgroundImage = `url(${buttonIconUrl})`; 
            icon.style.backgroundSize = `24px`; 
            icon.style.backgroundRepeat = `no-repeat`; 
            icon.style.backgroundPosition = `center`; 
        }
        return button;
    }

    removeToolbarButton(button) {
        const group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        group.removeControl(button);
    }

    loadScript(url, namespace) {
        if (window[namespace] !== undefined) {
            return Promise.resolve();
        }
        return new Promise(function (resolve, reject) {
            const el = document.createElement('script');
            el.src = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

    loadStylesheet(url) {
        return new Promise(function (resolve, reject) {
            const el = document.createElement('link');
            el.rel = 'stylesheet';
            el.href = url;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });
    }

}