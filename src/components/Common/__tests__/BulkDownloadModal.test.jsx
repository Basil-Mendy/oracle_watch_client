/**
 * Tests for BulkDownloadModal Component
 * Testing bulk download functionality with progress tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkDownloadModal from '../BulkDownloadModal';
import * as resultService from '../../services/resultService';

// Mock the resultService
jest.mock('../../services/resultService');

describe('BulkDownloadModal Component', () => {
    const mockOnClose = jest.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        election: {
            id: 'election-123',
            name: 'Test Election 2026'
        },
        pollingUnitId: 'PU-001',
        counts: {
            images: 5,
            videos: 3
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock window.URL.createObjectURL
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        // Mock timers
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('renders modal when isOpen is true', () => {
        render(<BulkDownloadModal {...defaultProps} />);
        expect(screen.getByText(/Download Evidence/i)).toBeInTheDocument();
    });

    test('does not render modal when isOpen is false', () => {
        const closedProps = { ...defaultProps, isOpen: false };
        render(<BulkDownloadModal {...closedProps} />);
        expect(screen.queryByText(/Download Evidence/i)).not.toBeInTheDocument();
    });

    test('displays image count option', () => {
        render(<BulkDownloadModal {...defaultProps} />);
        expect(screen.getByText(/📷 Photos Only/i)).toBeInTheDocument();
        expect(screen.getByText(/5 photos/i)).toBeInTheDocument();
    });

    test('displays video count option', () => {
        render(<BulkDownloadModal {...defaultProps} />);
        expect(screen.getByText(/🎥 Videos Only/i)).toBeInTheDocument();
        expect(screen.getByText(/3 videos/i)).toBeInTheDocument();
    });

    test('displays both option', () => {
        render(<BulkDownloadModal {...defaultProps} />);
        expect(screen.getByText(/📦 Both Images and Videos/i)).toBeInTheDocument();
    });

    test('disables photos option when count is 0', () => {
        const noCounts = {
            ...defaultProps,
            counts: { images: 0, videos: 3 }
        };
        render(<BulkDownloadModal {...noCounts} />);
        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        expect(photosRadio).toBeDisabled();
    });

    test('disables videos option when count is 0', () => {
        const noCounts = {
            ...defaultProps,
            counts: { images: 5, videos: 0 }
        };
        render(<BulkDownloadModal {...noCounts} />);
        const videosRadio = screen.getByRole('radio', { name: /🎥 Videos Only/i });
        expect(videosRadio).toBeDisabled();
    });

    test('allows selecting photos only', async () => {
        render(<BulkDownloadModal {...defaultProps} />);
        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });

        await userEvent.click(photosRadio);
        expect(photosRadio).toBeChecked();
    });

    test('allows selecting videos only', async () => {
        render(<BulkDownloadModal {...defaultProps} />);
        const videosRadio = screen.getByRole('radio', { name: /🎥 Videos Only/i });

        await userEvent.click(videosRadio);
        expect(videosRadio).toBeChecked();
    });

    test('allows selecting both', async () => {
        render(<BulkDownloadModal {...defaultProps} />);
        const bothRadio = screen.getByRole('radio', { name: /📦 Both/i });

        await userEvent.click(bothRadio);
        expect(bothRadio).toBeChecked();
    });

    test('calls download service when download button clicked with images selected', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockResolvedValue({ data: mockBlob });

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        await waitFor(() => {
            expect(resultService.bulkDownloadImages).toHaveBeenCalledWith({
                unit_id: 'PU-001',
                password: expect.any(String),
                election_id: 'election-123'
            });
        });
    });

    test('shows progress bar during download', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ data: mockBlob }), 100))
        );

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        // Progress bar should be visible
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
    });

    test('updates progress during bulk download', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockResolvedValue({ data: mockBlob });
        resultService.bulkDownloadVideos.mockResolvedValue({ data: mockBlob });

        render(<BulkDownloadModal {...defaultProps} />);

        const bothRadio = screen.getByRole('radio', { name: /📦 Both/i });
        await userEvent.click(bothRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        // Progress should start at 0
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '0');

        // Wait for first download (should reach 50%)
        await waitFor(() => {
            expect(resultService.bulkDownloadImages).toHaveBeenCalled();
        });

        // Wait for second download (should reach 100%)
        await waitFor(() => {
            expect(resultService.bulkDownloadVideos).toHaveBeenCalled();
        });
    });

    test('shows success message after download', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockResolvedValue({ data: mockBlob });

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        await waitFor(() => {
            expect(screen.getByText(/Download successful/i)).toBeInTheDocument();
        });
    });

    test('handles download error', async () => {
        const errorMessage = 'Download failed';
        resultService.bulkDownloadImages.mockRejectedValue(new Error(errorMessage));

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        await waitFor(() => {
            expect(screen.getByText(/Error/i)).toBeInTheDocument();
        });
    });

    test('closes modal after successful download', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockResolvedValue({ data: mockBlob });

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        await waitFor(() => {
            expect(screen.getByText(/Download successful/i)).toBeInTheDocument();
        });

        // Fast-forward time to trigger auto-close (2 seconds)
        jest.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    test('calls close handler when close button clicked', async () => {
        render(<BulkDownloadModal {...defaultProps} />);

        const closeButton = screen.getByRole('button', { name: /close|cancel/i });
        await userEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    test('disables download button while downloading', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ data: mockBlob }), 100))
        );

        render(<BulkDownloadModal {...defaultProps} />);

        const photosRadio = screen.getByRole('radio', { name: /📷 Photos Only/i });
        await userEvent.click(photosRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        expect(downloadButton).toBeDisabled();
    });

    test('downloads both images and videos when both selected', async () => {
        const mockBlob = new Blob(['zip content'], { type: 'application/zip' });
        resultService.bulkDownloadImages.mockResolvedValue({ data: mockBlob });
        resultService.bulkDownloadVideos.mockResolvedValue({ data: mockBlob });

        render(<BulkDownloadModal {...defaultProps} />);

        const bothRadio = screen.getByRole('radio', { name: /📦 Both/i });
        await userEvent.click(bothRadio);

        const downloadButton = screen.getByRole('button', { name: /Download/i });
        await userEvent.click(downloadButton);

        await waitFor(() => {
            expect(resultService.bulkDownloadImages).toHaveBeenCalled();
            expect(resultService.bulkDownloadVideos).toHaveBeenCalled();
        });
    });
});
