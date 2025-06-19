import React, { useState, useEffect } from 'react';
import { Upload, Link, FileText, Image, Download, Trash2, Copy, Share2, ChevronDown, ChevronUp, CloudDownload, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import './App.css';

// Utility function for class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// File Upload Store (simplified for web)
const useFileUploadStore = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [appRepository, setAppRepository] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, timestamp }]);
  };

  const clearSelectedFiles = () => setSelectedFiles([]);
  const clearLogs = () => setLogs([]);

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateAppInRepository = (appName, type, data) => {
    if (!appRepository) return;
    
    const updatedApps = appRepository.apps.map(app => {
      if (app.name === appName) {
        if (type === 'image') {
          return { ...app, iconURL: data };
        } else {
          return { ...app, downloadURL: data };
        }
      }
      return app;
    });
    
    setAppRepository({ ...appRepository, apps: updatedApps });
  };

  const exportRepository = () => {
    return JSON.stringify(appRepository, null, 2);
  };

  return {
    selectedFiles,
    setSelectedFiles,
    uploadedFiles,
    setUploadedFiles,
    appRepository,
    setAppRepository,
    logs,
    addLog,
    clearSelectedFiles,
    clearLogs,
    removeUploadedFile,
    updateAppInRepository,
    exportRepository
  };
};

// Main Upload Screen Component
function MergedUploadScreen() {
  const {
    selectedFiles,
    setSelectedFiles,
    appRepository,
    setAppRepository,
    logs,
    addLog,
    clearSelectedFiles,
    clearLogs,
    updateAppInRepository,
    exportRepository
  } = useFileUploadStore();

  const [showLabeling, setShowLabeling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  // File picker functions
  const pickImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files).map((file, index) => ({
        uri: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        type: file.type,
        file: file
      }));
      setSelectedFiles(files);
      handleFilesSelected(files);
      addLog('success', `Selected ${files.length} photos: ${files.map(f => f.name).join(', ')}`);
    };
    input.click();
  };

  const pickFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files).map((file, index) => ({
        uri: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        type: file.type,
        file: file
      }));
      setSelectedFiles(files);
      handleFilesSelected(files);
      addLog('success', `Selected ${files.length} files: ${files.map(f => f.name).join(', ')}`);
    };
    input.click();
  };

  const handleFilesSelected = (files) => {
    if (files.length > 0) {
      addLog('info', `Setting showLabeling to true for ${files.length} files`);
      setShowLabeling(true);
    }
  };

  const handleCancel = () => {
    clearSelectedFiles();
    setShowLabeling(false);
  };

  // JSON Management Functions
  const loadJsonFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target.result);
            if (!jsonData.apps || !Array.isArray(jsonData.apps)) {
              throw new Error('Invalid JSON structure: missing apps array');
            }
            setAppRepository(jsonData);
            addLog('success', `Loaded JSON repository: ${jsonData.name} with ${jsonData.apps.length} apps`);
          } catch (parseError) {
            addLog('error', `Failed to parse JSON: ${parseError.message}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const exportJson = () => {
    if (!appRepository) return;
    
    const jsonString = exportRepository();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appRepository.name || 'repository'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', 'Repository JSON downloaded');
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addLog('success', 'Repository JSON copied to clipboard');
    } catch (error) {
      addLog('error', 'Failed to copy JSON to clipboard');
    }
  };

  const clearRepository = () => {
    if (confirm('Are you sure you want to clear the loaded repository? This will remove all app data.')) {
      setAppRepository({
        website: '',
        subtitle: '',
        iconURL: '',
        tintColor: '',
        identifier: '',
        featuredApps: [],
        description: '',
        name: 'New Repository',
        apps: []
      });
      addLog('info', 'Repository cleared');
    }
  };

  const handleAppNameSelect = async (appName) => {
    addLog('info', `App clicked: "${appName}", selectedFiles.length: ${selectedFiles.length}`);
    
    if (selectedFiles.length > 0) {
      addLog('info', `🔄 Processing ${selectedFiles.length} files for app: "${appName}"`);
      
      try {
        for (const file of selectedFiles) {
          const fileType = getFileType(file);
          addLog('info', `📁 Processing file: ${file.name} (type: ${fileType})`);
          
          if (fileType === 'image') {
            addLog('info', `🖼️ Converting image to base64...`);
            const reader = new FileReader();
            reader.onload = (e) => {
              updateAppInRepository(appName, 'image', e.target.result);
              addLog('success', `Image ${file.name} processed for ${appName}`);
            };
            reader.readAsDataURL(file.file);
          } else if (fileType === 'document') {
            addLog('info', `📄 Converting document to base64...`);
            const reader = new FileReader();
            reader.onload = (e) => {
              updateAppInRepository(appName, 'document', e.target.result);
              addLog('success', `Document ${file.name} processed for ${appName}`);
            };
            reader.readAsDataURL(file.file);
          }
        }
        addLog('success', `✅ All selected files processed for ${appName}`);
        clearSelectedFiles();
        setShowLabeling(false);
      } catch (error) {
        addLog('error', `❌ Error processing files: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      addLog('warning', 'No files selected to process.');
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) {
      return 'image';
    } else if (file.type === 'application/pdf' || file.type === 'text/plain' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'document';
    } else {
      return 'other';
    }
  };

  const filteredApps = appRepository?.apps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">File Upload Manager</h1>
          <div className="flex space-x-2">
            <Button onClick={loadJsonFile} variant="outline">
              <CloudDownload className="mr-2 h-4 w-4" /> Load JSON
            </Button>
            <Button onClick={exportJson} variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={() => copyToClipboard(exportRepository())} variant="outline">
              <Copy className="mr-2 h-4 w-4" /> Copy JSON
            </Button>
            <Button onClick={clearRepository} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear Repo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Selection & Upload */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Files</h2>
            <div className="flex space-x-4 mb-4">
              <Button onClick={pickImages}>
                <Image className="mr-2 h-4 w-4" /> Pick Photos
              </Button>
              <Button onClick={pickFiles}>
                <FileText className="mr-2 h-4 w-4" /> Pick Documents
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length})</h3>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                  ))}
                </ul>
                <Button onClick={handleCancel} variant="outline" className="mt-2">
                  Cancel Selection
                </Button>
              </div>
            )}

            {showLabeling && appRepository && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Label Files to App</h3>
                <input
                  type="text"
                  placeholder="Search apps..."
                  className="w-full p-2 border border-gray-300 rounded-md mb-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-2 rounded-md">
                  {filteredApps.length > 0 ? (
                    filteredApps.map((app) => (
                      <Button
                        key={app.identifier}
                        onClick={() => handleAppNameSelect(app.name)}
                        variant="outline"
                        className="justify-start"
                        disabled={isLoading}
                      >
                        {app.name}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-2">No apps found or repository empty.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Activity Logs</h2>
              <Button onClick={() => setShowLogs(!showLogs)} variant="outline" size="sm">
                {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            {showLogs && (
              <div className="border border-gray-200 rounded-md p-2 max-h-60 overflow-y-auto text-sm font-mono bg-gray-50">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No activity yet.</p>
                ) : (
                  logs.map((log, index) => (
                    <p key={index} className={cn(
                      log.type === 'info' && 'text-blue-600',
                      log.type === 'success' && 'text-green-600',
                      log.type === 'error' && 'text-red-600',
                      log.type === 'warning' && 'text-yellow-600'
                    )}>
                      [{log.timestamp}] {log.message}
                    </p>
                  ))
                )}
              </div>
            )}
            <Button onClick={clearLogs} variant="outline" className="mt-4">
              Clear Logs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Links Screen Component
function LinksScreen() {
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState('');

  useEffect(() => {
    // Load links from local storage on component mount
    const storedLinks = localStorage.getItem('userLinks');
    if (storedLinks) {
      setLinks(JSON.parse(storedLinks));
    }
  }, []);

  useEffect(() => {
    // Save links to local storage whenever they change
    localStorage.setItem('userLinks', JSON.stringify(links));
  }, [links]);

  const handleAddLink = () => {
    if (newLink.trim() !== '') {
      setLinks([...links, { id: Date.now(), url: newLink.trim() }]);
      setNewLink('');
    }
  };

  const handleDeleteLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Links</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Link</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter URL..."
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
          />
          <Button onClick={handleAddLink}>
            <Link className="mr-2 h-4 w-4" /> Add Link
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Links</h2>
        {links.length === 0 ? (
          <p className="text-gray-500">No links added yet.</p>
        ) : (
          <ul className="space-y-3">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200">
                <a 
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate flex-1 mr-4"
                >
                  {link.url}
                </a>
                <Button onClick={() => handleDeleteLink(link.id)} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto p-4 flex justify-center space-x-4">
          <Button
            variant={activeTab === 'upload' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('upload')}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button
            variant={activeTab === 'links' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('links')}
          >
            <Link className="mr-2 h-4 w-4" /> Links
          </Button>
        </nav>
      </header>
      <main>
        {activeTab === 'upload' && <MergedUploadScreen />}
        {activeTab === 'links' && <LinksScreen />}
      </main>
    </div>
  );
}

export default App;


