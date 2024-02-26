import './assets/icons/icons.css'
import './style.css'
import './dialog.css'
import {
  GraphComponent,
  FoldingManager,
  GraphEditorInputMode,
  ICommand,
  ScrollBarVisibility,
  HierarchicLayout,
  DefaultLabelStyle,
  ShapeNodeStyle,
  Size,
  GroupNodeStyle,
  InteriorLabelModel,
  InteriorLabelModelPosition,
  OrganicLayout,
  OrthogonalLayout,
  ILayoutAlgorithm,
  TextWrapping,
  Rect,
  SvgVisual,
  PolylineEdgeStyle,
  EdgeBundling,
  Arrow
} from 'yfiles'
import { enableFolding } from './lib/FoldingSupport'
import loadGraph from './lib/loadGraph'
import './lib/yFilesLicense'
import { initializeTooltips } from './tooltips'
import { exportDiagram } from './diagram-export'
import { PrintingSupport } from './lib/PrintingSupport'
import { initializeContextMenu } from './context-menu'
import { initializeGraphSearch } from './graph-search'

async function run() {
  const graphComponent = await initializeGraphComponent()
  initializeToolbar(graphComponent)
  initializeTooltips(graphComponent)
  initializeContextMenu(graphComponent)
  initializeGraphSearch(graphComponent)
}

function getRandomColor() {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function getContrastingColor(hexColor) {
  const r = parseInt(hexColor.substr(1, 2), 16)
  const g = parseInt(hexColor.substr(3, 2), 16)
  const b = parseInt(hexColor.substr(5, 2), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? 'black' : 'white'
}

const edgeStyle = new PolylineEdgeStyle({
  stroke: '2px solid black',
  targetArrow: new Arrow({ type: 'triangle', scale: 2, fill: 'black' }) // This adds arrows to the edges
});



async function initializeGraphComponent() {
  const graphComponent = new GraphComponent(document.querySelector('.graph-component-container'))
  graphComponent.horizontalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC
  graphComponent.verticalScrollBarPolicy = ScrollBarVisibility.AS_NEEDED_DYNAMIC
  const inputMode = new GraphEditorInputMode()
  inputMode.allowGroupingOperations = true
  graphComponent.inputMode = inputMode
  const foldingManager = graphComponent.graph.lookup(FoldingManager.$class)
  if (foldingManager) {
    foldingManager.masterGraph.undoEngineEnabled = true
  }
  graphComponent.fitGraphBounds()
  const data = [
    {
      domain: "Finance",
      sourceSystems: [
        {
          name: "AccountingDB",
          tables: [
            { name: "Invoices", connectsTo: ["Salaries", "Campaigns"] },
            { name: "Payments", connectsTo: ["DealsClosed"] },
            { name: "Budgets", connectsTo: ["Assets"] }
          ]
        },
        {
          name: "PayrollDB",
          tables: [
            { name: "Salaries", connectsTo: ["Employees"] },
            { name: "Bonuses", connectsTo: [] },
            { name: "Deductions", connectsTo: [] }
          ]
        }
      ]
    },
    {
      domain: "HR",
      sourceSystems: [
        {
          name: "RecruitmentDB",
          tables: [
            { name: "Candidates", connectsTo: ["Interviews"] },
            { name: "Interviews", connectsTo: ["Offers", "Feedbacks"] },
            { name: "Offers", connectsTo: [] }
          ]
        },
        {
          name: "EmployeeDB",
          tables: [
            { name: "Employees", connectsTo: ["Departments"] },
            { name: "Departments", connectsTo: [] },
            { name: "Positions", connectsTo: [] }
          ]
        }
      ]
    },
    {
      domain: "IT",
      sourceSystems: [
        {
          name: "AssetManagementDB",
          tables: [
            { name: "Assets", connectsTo: ["Licenses"] },
            { name: "Licenses", connectsTo: [] },
            { name: "Vendors", connectsTo: [] }
          ]
        },
        {
          name: "SupportDB",
          tables: [
            { name: "Tickets", connectsTo: ["ServiceLevels"] },
            { name: "ServiceLevels", connectsTo: ["Customers"] },
            { name: "Customers", connectsTo: [] }
          ]
        }
      ]
    },
    {
      domain: "Marketing",
      sourceSystems: [
        {
          name: "CampaignsDB",
          tables: [
            { name: "Campaigns", connectsTo: ["Leads"] },
            { name: "Leads", connectsTo: ["Conversions"] },
            { name: "Conversions", connectsTo: [] }
          ]
        },
        {
          name: "SocialMediaDB",
          tables: [
            { name: "Posts", connectsTo: ["Interactions"] },
            { name: "Interactions", connectsTo: ["Followers"] },
            { name: "Followers", connectsTo: [] }
          ]
        }
      ]
    },
    {
      domain: "Sales",
      sourceSystems: [
        {
          name: "SalesDB",
          tables: [
            { name: "Opportunities", connectsTo: ["DealsClosed"] },
            { name: "DealsClosed", connectsTo: ["Contacts"] },
            { name: "Contacts", connectsTo: [] }
          ]
        },
        {
          name: "CustomerFeedbackDB",
          tables: [
            { name: "Feedbacks", connectsTo: ["Ratings"] },
            { name: "Ratings", connectsTo: ["Improvements"] },
            { name: "Improvements", connectsTo: [] }
          ]
        }
      ]
    }
  ];
  
  processData(graphComponent, data)
  return graphComponent
}

function setupLabelStyles(graphComponent) {
  const labelStyle = new DefaultLabelStyle({
    wrapping: TextWrapping.WORD_ELLIPSIS,
    horizontalTextAlignment: 'center',
    verticalTextAlignment: 'center',
    autoFlip: false,
  });
  graphComponent.graph.nodeDefaults.labels.style = labelStyle;
  graphComponent.graph.nodeDefaults.size = new Size(100, 50);
}

const domainColor = getRandomColor()
const domainGroupStyle = createCustomGroupNodeStyle(domainColor)

function processData(graphComponent, data) {
  setupLabelStyles(graphComponent);
  const graph = graphComponent.graph;
  const labelModel = new InteriorLabelModel({ insets: 3 }).createParameter(InteriorLabelModelPosition.NORTH_EAST);
  const nodeLookup = {}; // A lookup to find nodes by table name

  const edgeStyle = new PolylineEdgeStyle({
    stroke: '2px solid black',
    targetArrow: new Arrow({ type: 'triangle', scale: 2, fill: 'black' }) // This adds arrows to the edges
  });
  graph.edgeDefaults.style = edgeStyle;


  data.forEach(domain => {
    const domainColor = getRandomColor();
    const domainTextColor = getContrastingColor(domainColor);
    const domainGroupStyle = createCustomGroupNodeStyle(domainColor);

    const domainGroupNode = graph.createGroupNode(null, new Rect(0, 0, 200, 100), domainGroupStyle);
    graph.addLabel(domainGroupNode, domain.domain, labelModel, new DefaultLabelStyle({ textFill: domainTextColor }));

    domain.sourceSystems.forEach(sourceSystem => {
      const systemColor = getRandomColor();
      const systemTextColor = getContrastingColor(systemColor);
      const systemGroupStyle = createCustomGroupNodeStyle(systemColor);

      const sourceSystemGroupNode = graph.createGroupNode(domainGroupNode, new Rect(0, 0, 180, 80), systemGroupStyle);
      graph.addLabel(sourceSystemGroupNode, sourceSystem.name, labelModel, new DefaultLabelStyle({ textFill: systemTextColor }));

      sourceSystem.tables.forEach(table => {
        const tableNode = graph.createNode(sourceSystemGroupNode, new Rect(0, 0, 160, 60), new ShapeNodeStyle({ fill: 'white', stroke: 'black' }));
        graph.addLabel(tableNode, table.name, labelModel, new DefaultLabelStyle({ textFill: 'black' }));

        // Save node reference for connection creation
        nodeLookup[table.name] = tableNode;
      });
    });
  });

  // After all nodes are created, create edges based on the connectsTo relationships
  data.forEach(domain => {
    domain.sourceSystems.forEach(sourceSystem => {
      sourceSystem.tables.forEach(table => {
        if (table.connectsTo) { // Ensure connectsTo property exists
          table.connectsTo.forEach(targetTableName => {
            const fromNode = nodeLookup[table.name];
            const toNode = nodeLookup[targetTableName];
            if (fromNode && toNode) {
              const edge = graph.createEdge(fromNode, toNode);
              graph.setStyle(edge, edgeStyle);
            }
          });
        }
      });
    });
  });

  applyHierarchicLayout(graphComponent);
}



function createCustomGroupNodeStyle(fillColor) {
  return new class extends GroupNodeStyle {
    createVisual(context, groupNode) {
      const svgNamespace = 'http://www.w3.org/2000/svg';
      const visual = document.createElementNS(svgNamespace, 'g');
      const rect = document.createElementNS(svgNamespace, 'rect');
      rect.setAttribute('fill', fillColor);
      rect.setAttribute('width', groupNode.layout.width.toString());
      rect.setAttribute('height', groupNode.layout.height.toString());
      visual.appendChild(rect);
      return new SvgVisual(visual);
    }
  }();
}

function applyHierarchicLayout(graphComponent) {
  const layout = new HierarchicLayout();

  // Configure edge bundling
  const bundling = new EdgeBundling();
  bundling.bundlingStrength = 0.95; // Adjust the strength as needed (0..1)
  layout.edgeBundling = bundling;

  layout.integratedEdgeLabeling = true;
  graphComponent.morphLayout(layout, '1s');
}

function initializeToolbar(graphComponent) {
  document.getElementById('btn-increase-zoom').addEventListener('click', () => {
    ICommand.INCREASE_ZOOM.execute(null, graphComponent)
  })

  document.getElementById('btn-decrease-zoom').addEventListener('click', () => {
    ICommand.DECREASE_ZOOM.execute(null, graphComponent)
  })

  document.getElementById('btn-clear').addEventListener('click', () => {
    graphComponent.graph.clear()
    ICommand.FIT_GRAPH_BOUNDS.execute(null, graphComponent)
  })

  document.getElementById('btn-undo').addEventListener('click', () => {
    ICommand.UNDO.execute(null, graphComponent)
  })

  document.getElementById('btn-redo').addEventListener('click', () => {
    ICommand.REDO.execute(null, graphComponent)
  })

  document.getElementById('btn-export-svg').addEventListener('click', () => {
    exportDiagram(graphComponent, 'svg')
  })

  document.getElementById('btn-export-png').addEventListener('click', () => {
    exportDiagram(graphComponent, 'png')
  })

  document.getElementById('btn-print').addEventListener('click', () => {
    const printingSupport = new PrintingSupport()
    printingSupport.printGraph(graphComponent.graph)
  })

  const layoutDropdown = document.getElementById('layout-dropdown')
  layoutDropdown.addEventListener('change', function (event) {
    const selectedLayout = event.target.value
    switch (selectedLayout) {
      case 'hierarchic':
        applyLayout(new HierarchicLayout(), graphComponent)
        break
      case 'organic':
        applyLayout(new OrganicLayout(), graphComponent)
        break
      case 'orthogonal':
        applyLayout(new OrthogonalLayout(), graphComponent)
        break
    }
  })
}

function applyLayout(layoutAlgorithm, graphComponent) {
  graphComponent.morphLayout(layoutAlgorithm, '700ms')
}

run()
