/// import * as Autodesk from "@types/forge-viewer";
import './extensions/LoggerExtension.js';
import './extensions/SummaryExtension.js';
import './extensions/HistogramExtension.js';
import './extensions/CameraRotation/contents/main.js';
import './extensions/VisualClusters/VisualClusters.js';

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: [
                            // 'Autodesk.DocumentBrowser'
                            // ,
                            'LoggerExtension'
                            ,
                            // 'SummaryExtension'
                            // ,
                            'HistogramExtension'
                            ,
                            'CameraRotation'                            
                            ,
                            'Autodesk.NPR'
                            ,
                            'Autodesk.VisualClusters'
                ]      
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();

            viewer.setDisplayEdges(true);
            viewer.setLightPreset(1);
            viewer.setQualityLevel(false, true);            
            viewer.setEnvMapBackground(false);
            viewer.setTheme('light-theme');

            ////////////////////////////            

            viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
                // console.log('GEOMETRY_LOADED_EVENT!!!!!!!!!!!!!!!!');
                // viewer.setBackgroundColor(0, 0, 0, 0, 0, 0);
                // viewer.setSelectionColor(new THREE.Color(0.4, 0.6, 1));
                viewer.setDisplayEdges(true);
                viewer.setLightPreset(1);
                viewer.setQualityLevel(false, true);
                viewer.setEnvMapBackground(false);
                viewer.setTheme('light-theme');

                // const npr=viewer.getExtension('Autodesk.NPR');   ///poast processing shading
                // npr.setParameter("style", "edging");
                // npr.setParameter("edges", true);                
                // ext.setParameter("brightness", 0.5);

                const viewcube=viewer.getExtension('Autodesk.ViewCubeUi');
                viewcube.displayViewCube(false,true);                
            });

            ////////////////////////////

            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        viewer.setLightPreset(0);
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}
