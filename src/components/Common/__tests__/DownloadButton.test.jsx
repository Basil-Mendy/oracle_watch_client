/**
 * Tests for DownloadButton Component
 * Testing single file download functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DownloadButton from '../DownloadButton';
import * as resultService from '../../services/resultService';

// Mock the resultService
jest.mock('../../services/resultService');

describe('DownloadButton Component', () => {
    const mockOnDownload = jest.fn();

    const defaultProps = {
        item: {
            id: 'test-id-123',
            type: 'image',
            filename: 'test-image.jpg'
        },
        onDownload: mockOnDownload
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock window.URL.createObjectURL
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders download button with default label', () => {
        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
    });

    test('calls download service when button clicked', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockResolvedValue({ data: mockBlob });

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(resultService.downloadImage).toHaveBeenCalledWith('test-id-123');
        });
    });

    test('shows loading state during download', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ data: mockBlob }), 100))
        );

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        // Should show loading state briefly
        expect(button).toHaveClass('loading');
    });

    test('triggers browser download on successful download', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockResolvedValue({ data: mockBlob });

        // Mock createElement and click
        const mockLink = {
            href: '',
            download: '',
            click: jest.fn()
        };
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(mockLink.click).toHaveBeenCalled();
            expect(createElementSpy).toHaveBeenCalledWith('a');
        });

        createElementSpy.mockRestore();
    });

    test('shows success state after download', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockResolvedValue({ data: mockBlob });

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveClass('success');
        });
    });

    test('handles download error appropriately', async () => {
        const errorMessage = 'Download failed';
        resultService.downloadImage.mockRejectedValue(new Error(errorMessage));

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveClass('error');
        });
    });

    test('calls onDownload callback after successful download', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockResolvedValue({ data: mockBlob });

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(mockOnDownload).toHaveBeenCalledWith(defaultProps.item);
        });
    });

    test('renders in compact mode', () => {
        render(<DownloadButton {...defaultProps} compact={true} />);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('compact');
    });

    test('handles video download', async () => {
        const mockBlob = new Blob(['test video'], { type: 'video/mp4' });
        resultService.downloadVideo.mockResolvedValue({ data: mockBlob });

        const videoProps = {
            ...defaultProps,
            item: {
                id: 'video-id-123',
                type: 'video',
                filename: 'test-video.mp4'
            }
        };

        render(<DownloadButton {...videoProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(resultService.downloadVideo).toHaveBeenCalledWith('video-id-123');
        });
    });

    test('disables button during download', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ data: mockBlob }), 100))
        );

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        expect(button).toBeDisabled();
    });

    test('re-enables button after download completes', async () => {
        const mockBlob = new Blob(['test content'], { type: 'image/jpeg' });
        resultService.downloadImage.mockResolvedValue({ data: mockBlob });

        render(<DownloadButton {...defaultProps} />);
        const button = screen.getByRole('button');

        await userEvent.click(button);

        await waitFor(() => {
            expect(button).not.toBeDisabled();
        });
    });
});
