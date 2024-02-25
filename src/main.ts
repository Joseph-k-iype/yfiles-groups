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
  PolylineEdgeStyle
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
  stroke: '2px solid black'
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
          tables: ["Invoices", "Payments", "Budgets"]
        },
        {
          name: "PayrollDB",
          tables: ["Salaries", "Bonuses", "Deductions"]
        }
      ]
    },
    {
      domain: "HR",
      sourceSystems: [
        {
          name: "RecruitmentDB",
          tables: ["Invoices", "Interviews", "Offers"]
        },
        {
          name: "EmployeeDB",
          tables: ["Employees", "Departments", "Positions"]
        }
      ]
    },
    {
      domain: "IT",
      sourceSystems: [
        {
          name: "AssetManagementDB",
          tables: ["Assets", "Licenses", "Vendors"]
        },
        {
          name: "SupportDB",
          tables: ["Tickets", "ServiceLevels", "Customers"]
        }
      ]
    }
  ]
  processData(graphComponent, data)
  return graphComponent
}

function setupLabelStyles(graphComponent) {
  const labelStyle = new DefaultLabelStyle({
    wrapping: TextWrapping.WORD_ELLIPSIS,
    horizontalTextAlignment: 'center',
    verticalTextAlignment: 'center',
    autoFlip: false
  })
  graphComponent.graph.nodeDefaults.labels.style = labelStyle
  graphComponent.graph.nodeDefaults.size = new Size(100, 50)
}

const domainColor = getRandomColor()
const domainGroupStyle = createCustomGroupNodeStyle(domainColor)

function processData(graphComponent, data) {
  setupLabelStyles(graphComponent);
  const graph = graphComponent.graph;
  const labelModel = new InteriorLabelModel({ insets: 3 }).createParameter(InteriorLabelModelPosition.NORTH_EAST);

  data.forEach(domain => {
    const domainColor = getRandomColor();
    const domainTextColor = getContrastingColor(domainColor);
    const DomainGroupStyleClass = createCustomGroupNodeStyle(domainColor);
    const domainGroupStyle = new DomainGroupStyleClass();

    const domainGroupNode = graph.createGroupNode(null, new Rect(0, 0, 200, 100), domainGroupStyle);
    // Corrected: Added label with the correct layout parameter and style parameter
    graph.addLabel(domainGroupNode, domain.domain, labelModel, new DefaultLabelStyle({
      textFill: domainTextColor,
    }));

    domain.sourceSystems.forEach(sourceSystem => {
      const systemColor = getRandomColor();
      const systemTextColor = getContrastingColor(systemColor);
      const SystemGroupStyleClass = createCustomGroupNodeStyle(systemColor);
      const systemGroupStyle = new SystemGroupStyleClass();

      const sourceSystemGroupNode = graph.createGroupNode(domainGroupNode, new Rect(0, 0, 180, 80), systemGroupStyle);
      // Corrected: Added label with the correct layout parameter and style parameter
      graph.addLabel(sourceSystemGroupNode, sourceSystem.name, labelModel, new DefaultLabelStyle({
        textFill: systemTextColor,
      }));

      sourceSystem.tables.forEach(table => {
        const tableNode = graph.createNode(sourceSystemGroupNode, new Rect(0, 0, 160, 60), new ShapeNodeStyle({
          fill: 'white',
          stroke: 'black',
        }));
        
        // const edgeToTable = graph.createEdge(sourceSystemGroupNode, tableNode);
        // graph.setStyle(edgeToTable, edgeStyle);
        const edgeToSystem = graph.createEdge(domainGroupNode, sourceSystemGroupNode);
      graph.setStyle(edgeToSystem, edgeStyle);
        // Corrected: Added label with the correct layout parameter and style parameter
        graph.addLabel(tableNode, table, labelModel, new DefaultLabelStyle({
          textFill: 'black',
        }));
      });
    });
  });

  applyHierarchicLayout(graphComponent);
}



function createCustomGroupNodeStyle(fillColor) {
  return class CustomGroupNodeStyle extends GroupNodeStyle {
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

    updateVisual(context, oldVisual, groupNode) {
      // Implementation of updateVisual if necessary
      return this.createVisual(context, groupNode);
    }
  };
}

function applyHierarchicLayout(graphComponent) {
  const layout = new HierarchicLayout()
  layout.integratedEdgeLabeling = true
  graphComponent.morphLayout(layout, '1s')
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
